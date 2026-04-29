const k8s = require("@kubernetes/client-node");
const yaml = require("js-yaml");
const logger = require("../utils/logger");
const fs = require("fs");

const kc = new k8s.KubeConfig();

// Load config from shared K3s file or fallback to default locations
const k3sConfigPath = "/root/.kube/k3s.yaml";
try {
  if (fs.existsSync(k3sConfigPath)) {
    kc.loadFromFile(k3sConfigPath);
    const cluster = kc.getCurrentCluster();
    if (cluster && (cluster.server.includes("127.0.0.1") || cluster.server.includes("localhost"))) {
      cluster.server = "https://k3s:6443";
      cluster.skipTLSVerify = true;
    }
    logger.info(`✅ Successfully loaded KubeConfig from ${k3sConfigPath}`);
  } else {
    kc.loadFromDefault();
    logger.info("ℹ️  Loaded KubeConfig from default location");
  }
} catch (e) {
  logger.warn(`⚠️  Failed to load KubeConfig: ${e.message}`);
  try {
    kc.loadFromCluster();
    logger.info("ℹ️  Using In-Cluster configuration");
  } catch (err) {
    logger.warn("❌ Kubernetes features disabled: No valid config found");
  }
}

const k8sApps = kc.makeApiClient(k8s.AppsV1Api);
const k8sCore = kc.makeApiClient(k8s.CoreV1Api);
const k8sNetworking = kc.makeApiClient(k8s.NetworkingV1Api);

const NAMESPACE = process.env.K8S_NAMESPACE || "weblaunch";

async function ensureNamespace() {
  try {
    await k8sCore.readNamespace(NAMESPACE);
  } catch {
    await k8sCore.createNamespace({ metadata: { name: NAMESPACE } });
    logger.info(`Created namespace: ${NAMESPACE}`);
  }
}

async function deployToK8s(deployment, imageName, onLog) {
  await ensureNamespace();

  const name = deployment.name.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const port = deployment.port || 3000;
  const replicas = deployment.replicas || 1;

  onLog(`☸️  Creating Kubernetes Deployment: ${name}`);

    const containers = [
      {
        name,
        image: imageName.replace("localhost:5000", "registry:5000"),
        ports: [{ containerPort: port }],
        env: Object.entries(deployment.envVars || {}).map(([k, v]) => ({ name: k, value: v })),
        resources: {
          requests: { cpu: "100m", memory: "128Mi" },
          limits: { cpu: "500m", memory: "512Mi" },
        },
        livenessProbe: { httpGet: { path: "/", port }, initialDelaySeconds: 30, periodSeconds: 10 },
        readinessProbe: { httpGet: { path: "/", port }, initialDelaySeconds: 10, periodSeconds: 5 },
      },
      {
        name: "tunnel",
        image: "cloudflare/cloudflared:latest",
        command: ["cloudflared", "tunnel", "--url", `http://localhost:${port}`],
        resources: {
          requests: { cpu: "50m", memory: "64Mi" },
          limits: { cpu: "100m", memory: "128Mi" },
        },
      }
    ];

    if (deployment.isFullStack) {
      containers.splice(1, 0, {
        name: "backend",
        image: imageName.replace("localhost:5000", "registry:5000") + "-backend",
        ports: [{ containerPort: 4000 }],
        env: [
          { name: "PORT", value: "4000" },
          { name: "REDIS_URL", value: "redis://localhost:6379" },
          { name: "NODE_ENV", value: "production" }
        ],
        volumeMounts: [
          { name: "docker-socket", mountPath: "/var/run/docker.sock" }
        ],
        resources: {
          requests: { cpu: "100m", memory: "128Mi" },
          limits: { cpu: "500m", memory: "512Mi" },
        }
      });
      // Add Redis sidecar
      containers.push({
        name: "redis",
        image: "redis:alpine",
        ports: [{ containerPort: 6379 }],
        resources: {
          requests: { cpu: "50m", memory: "64Mi" },
          limits: { cpu: "100m", memory: "128Mi" },
        }
      });
    }

    const k8sDeployment = {
      apiVersion: "apps/v1",
      kind: "Deployment",
      metadata: { name, namespace: NAMESPACE, labels: { app: name, "managed-by": "weblaunch" } },
      spec: {
        replicas,
        selector: { matchLabels: { app: name } },
        template: {
          metadata: { labels: { app: name } },
          spec: {
            containers: containers,
            volumes: [
              {
                name: "docker-socket",
                hostPath: { path: "/var/run/docker.sock", type: "Socket" }
              }
            ]
          },
        },
      },
    };

  try {
    await k8sApps.readNamespacedDeployment(name, NAMESPACE);
    await k8sApps.replaceNamespacedDeployment(name, NAMESPACE, k8sDeployment);
    onLog(`♻️  Updated existing deployment: ${name}`);
  } catch {
    await k8sApps.createNamespacedDeployment(NAMESPACE, k8sDeployment);
    onLog(`✅ Created deployment: ${name}`);
  }

  // Create Service
  const service = {
    apiVersion: "v1", kind: "Service",
    metadata: { name, namespace: NAMESPACE, labels: { app: name } },
    spec: { selector: { app: name }, ports: [{ port: 80, targetPort: port }], type: "ClusterIP" },
  };

  try {
    await k8sCore.readNamespacedService(name, NAMESPACE);
    await k8sCore.replaceNamespacedService(name, NAMESPACE, service);
  } catch {
    await k8sCore.createNamespacedService(NAMESPACE, service);
  }
  onLog(`🌐 Service created: ${name}`);
  
  // Create Ingress
  const hostname = `${name}.localhost`;
  const ingress = {
    apiVersion: "networking.k8s.io/v1",
    kind: "Ingress",
    metadata: { 
      name, 
      namespace: NAMESPACE, 
      labels: { app: name },
      annotations: {
        "traefik.ingress.kubernetes.io/router.entrypoints": "web"
      }
    },
    spec: {
      ingressClassName: "traefik",
      rules: [
        {
          host: hostname,
          http: {
            paths: [{
              path: "/",
              pathType: "Prefix",
              backend: { service: { name, port: { number: 80 } } }
            }]
          }
        },
        {
          // Catch-all rule for Cloudflare Tunnel / External access
          http: {
            paths: [{
              path: "/",
              pathType: "Prefix",
              backend: { service: { name, port: { number: 80 } } }
            }]
          }
        }
      ]
    }
  };

  try {
    await k8sNetworking.readNamespacedIngress(name, NAMESPACE);
    await k8sNetworking.replaceNamespacedIngress(name, NAMESPACE, ingress);
    onLog(`🛤️  Updated Ingress: ${hostname}`);
  } catch {
    await k8sNetworking.createNamespacedIngress(NAMESPACE, ingress);
    onLog(`🛤️  Created Ingress: ${hostname}`);
  }

  const startTime = new Date(Date.now() - 30000); // 30s buffer to catch pods created just before this call
  const publicUrl = await getCloudflareUrl(name, startTime, onLog);

  return { k8sName: name, namespace: NAMESPACE, servicePort: 80, hostname, publicUrl };
}

async function getCloudflareUrl(name, startTime, onLog) {
  onLog("⏳ Waiting for Cloudflare Tunnel URL...");
  for (let i = 0; i < 40; i++) {
    try {
      const pods = await k8sCore.listNamespacedPod(NAMESPACE, undefined, undefined, undefined, undefined, `app=${name}`);
      
      // Filter for pods created AFTER we started this deployment
      const latestPod = pods.body.items
        .filter(p => !p.metadata.deletionTimestamp && p.status.phase === "Running")
        .filter(p => new Date(p.metadata.creationTimestamp) >= startTime)
        .sort((a, b) => new Date(b.metadata.creationTimestamp) - new Date(a.metadata.creationTimestamp))[0];

      if (latestPod) {
        const response = await k8sCore.readNamespacedPodLog(latestPod.metadata.name, NAMESPACE, "tunnel");
        const logs = response.body.toString();
        const match = logs.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
        
        if (match) {
          const url = match[0].trim();
          onLog(`🌐 Public URL generated: ${url}`);
          return url;
        }
      }
    } catch (err) {
      // Ignore errors during startup
    }
    await new Promise(r => setTimeout(r, 3000));
    if (i % 10 === 0 && i > 0) onLog("... still waiting for tunnel assignment ...");
  }
  return null;
}

async function getPodStatus(name) {
  const pods = await k8sCore.listNamespacedPod(NAMESPACE, undefined, undefined, undefined, undefined, `app=${name}`);
  return pods.body.items.map(pod => ({
    name: pod.metadata.name,
    phase: pod.status.phase,
    ready: pod.status.conditions?.find(c => c.type === "Ready")?.status === "True",
    restarts: pod.status.containerStatuses?.[0]?.restartCount || 0,
    age: pod.metadata.creationTimestamp,
  }));
}

async function deleteDeployment(name) {
  try {
    await k8sApps.deleteNamespacedDeployment(name, NAMESPACE);
    await k8sCore.deleteNamespacedService(name, NAMESPACE);
    logger.info(`Deleted K8s deployment and service: ${name}`);
  } catch (e) {
    logger.warn(`K8s delete error: ${e.message}`);
  }
}

async function getPodsInNamespace() {
  try {
    const pods = await k8sCore.listNamespacedPod(NAMESPACE);
    return pods.body.items;
  } catch (err) {
    logger.error(`Error listing pods: ${err.message}`);
    return [];
  }
}

module.exports = { deployToK8s, getPodStatus, deleteDeployment, getPodsInNamespace };
