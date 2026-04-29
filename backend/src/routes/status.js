const express = require("express");
const router = express.Router();
const k8sManager = require("../services/k8sManager");
const { getDeployment } = require("../services/deploymentStore");

// GET /api/status/:id - Get full status with K8s pod info
router.get("/:id", async (req, res, next) => {
  try {
    const deployment = await getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ success: false, error: "Deployment not found" });
    }

    let podStatus = null;
    if (deployment.status === "running" && deployment.k8sName) {
      try {
        podStatus = await k8sManager.getPodStatus(deployment.k8sName);
      } catch (e) {
        // K8s may not be available in dev
      }
    }

    res.json({
      success: true,
      data: {
        ...deployment,
        podStatus,
        uptime: deployment.deployedAt
          ? Math.floor((Date.now() - new Date(deployment.deployedAt).getTime()) / 1000)
          : null,
      },
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/status/:id/metrics - Get deployment resource metrics
router.get("/:id/metrics", async (req, res, next) => {
  try {
    const deployment = await getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ success: false, error: "Deployment not found" });
    }

    let metrics = { cpu: "N/A", memory: "N/A", requests: 0 };
    if (deployment.k8sName) {
      try {
        metrics = await k8sManager.getPodMetrics(deployment.k8sName);
      } catch (e) {
        // ignore
      }
    }

    res.json({ success: true, data: metrics });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
