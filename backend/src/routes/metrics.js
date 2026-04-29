const express = require('express');
const router = express.Router();
const client = require('prom-client');

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, event loop lag, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics for WebLaunch
const httpRequestDuration = new client.Histogram({
    name: 'http_request_duration_seconds',
    help: 'Duration of HTTP requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    registers: [register]
});

const activeDeployments = new client.Gauge({
    name: 'weblaunch_active_deployments_total',
    help: 'Total number of active deployments',
    registers: [register]
});

const deploymentDuration = new client.Histogram({
    name: 'weblaunch_deployment_duration_seconds',
    help: 'Duration of deployments in seconds',
    labelNames: ['status', 'stack_type'],
    buckets: [5, 10, 30, 60, 120, 300, 600],
    registers: [register]
});

const queueSize = new client.Gauge({
    name: 'weblaunch_queue_size',
    help: 'Number of pending deployments in queue',
    registers: [register]
});

const deploymentErrors = new client.Counter({
    name: 'weblaunch_deployment_errors_total',
    help: 'Total number of deployment errors',
    labelNames: ['error_type'],
    registers: [register]
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

// GET /metrics - Prometheus metrics endpoint
router.get('/', async (req, res) => {
    try {
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