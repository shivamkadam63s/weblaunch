const express = require('express');
const router = express.Router();
const client = require('prom-client');
const logger = require('../utils/logger');

// Use the global default registry
const register = client.register;

// Custom metrics for WebLaunch
const httpRequestDuration = new client.Histogram({
    name: 'weblaunch_http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
});

const activeDeployments = new client.Gauge({
    name: 'weblaunch_active_deployments_total',
    help: 'Total number of active deployments',
});

const deploymentDuration = new client.Histogram({
    name: 'weblaunch_deployment_duration_seconds',
    help: 'Duration of deployments in seconds',
    labelNames: ['status', 'stack_type'],
    buckets: [5, 10, 30, 60, 120, 300, 600],
});

const queueSize = new client.Gauge({
    name: 'weblaunch_queue_size',
    help: 'Number of pending deployments in queue',
});

const deploymentErrors = new client.Counter({
    name: 'weblaunch_deployment_errors_total',
    help: 'Total number of deployment errors',
    labelNames: ['error_type'],
});

const podInfo = new client.Gauge({
    name: 'weblaunch_pod_info',
    help: 'Mapping between container IDs and pod/deployment names',
    labelNames: ['container_id', 'pod_name', 'deployment_name'],
});

// Middleware to measure request duration
const measureRequestDuration = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        httpRequestDuration
            .labels(req.method, req.route ? req.route.path : req.path, res.statusCode)
            .observe(duration);
    });
    next();
};

// Function to update pod info mapping from K8s
const updatePodInfo = async () => {
    try {
        const k8sManager = require('../services/k8sManager');
        if (typeof k8sManager.getPodsInNamespace !== 'function') return;
        
        const pods = await k8sManager.getPodsInNamespace();
        
        podInfo.reset();
        const uniqueDeployments = new Set();
        
        for (const pod of pods) {
            const deploymentName = pod.metadata.labels?.app;
            if (deploymentName) uniqueDeployments.add(deploymentName);
            
            const podName = pod.metadata.name;
            
            if (pod.status?.containerStatuses) {
                for (const status of pod.status.containerStatuses) {
                    if (status.containerID) {
                        const id = status.containerID.split('://')[1];
                        if (id) {
                            podInfo.labels(id, podName, deploymentName).set(1);
                        }
                    }
                }
            }
        }
        activeDeployments.set(uniqueDeployments.size);
    } catch (err) {
        // Silently ignore
    }
};

// GET /metrics - Prometheus metrics endpoint
router.get('/', async (req, res) => {
    try {
        await updatePodInfo();
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

// Export metrics components for use in other services
module.exports = {
    router,
    metrics: {
        activeDeployments,
        deploymentDuration,
        queueSize,
        deploymentErrors,
        measureRequestDuration
    }
};