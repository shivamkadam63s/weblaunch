const { deploymentQueue } = require("./deploymentQueue");
const { buildImage } = require("./dockerBuilder");
const { deployToK8s } = require("./k8sManager");
const { saveDeployment, updateDeployment, appendLog } = require("./deploymentStore");
const { runSonarScan } = require("./sonarScanner");
const logger = require("../utils/logger");

async function initDeploymentWorker(io) {
  deploymentQueue.process("deploy", 2, async (job) => {
    const deployment = job.data;
    const { id } = deployment;

    const emit = (level, message) => {
      const log = { timestamp: new Date().toISOString(), level, message };
      appendLog(id, log).catch(() => {});
      io.to(`deployment:${id}`).emit("log", log);
      logger.info(`[${id}] ${message}`);
    };

    try {
      await saveDeployment({ ...deployment, status: "building" });
      emit("info", `🚀 Starting deployment for ${deployment.repoUrl}`);
      emit("info", `🔍 Detected stack: ${deployment.stack} / ${deployment.framework}`);

      // Build Docker image
      const imageName = await buildImage(deployment, (msg) => emit("info", msg));
      await updateDeployment(id, { status: "deploying", imageName });

      // Non-blocking SonarQube Code Quality Scan
      // We start this asynchronously and let it resolve in the background
      runSonarScan(deployment).catch(err => {
        logger.error(`Background SonarQube scan failed for ${id}: ${err.message}`);
      });

      // Deploy to Kubernetes
      emit("info", "☸️  Deploying to Kubernetes...");
      let k8sResult = {};
      try {
        k8sResult = await deployToK8s(deployment, imageName, (msg) => emit("info", msg));
      } catch (k8sErr) {
        emit("warn", `⚠️  K8s deploy skipped (${k8sErr.message}). Image built successfully.`);
      }

      const url = k8sResult.hostname
        ? `http://${k8sResult.hostname}:8081`
        : `LOCAL_DOCKER_IMAGE:${imageName}`;

      await updateDeployment(id, {
        status: k8sResult.k8sName ? "running" : "image_ready",
        imageName,
        ...k8sResult,
        url,
        deployedAt: new Date().toISOString(),
      });

      emit("info", `✅ Deployment complete! URL: ${url}`);
      return { success: true, deploymentId: id, url };
    } catch (err) {
      emit("error", `❌ Deployment failed: ${err.message}`);
      await updateDeployment(id, { status: "failed", error: err.message }).catch(() => {});
      throw err;
    }
  });

  logger.info("Deployment worker started (concurrency: 2)");
}

module.exports = { initDeploymentWorker };
