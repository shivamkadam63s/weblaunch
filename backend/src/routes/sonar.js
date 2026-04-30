const express = require("express");
const router = express.Router();
const { getSonarMetricsByDeployment, getAllSonarMetrics } = require("../services/pgClient");
const logger = require("../utils/logger");

// Get code quality metrics for a specific deployment
router.get("/:deploymentId", async (req, res, next) => {
  try {
    const { deploymentId } = req.params;
    const metrics = await getSonarMetricsByDeployment(deploymentId);
    
    if (!metrics) {
      return res.status(404).json({ error: "Code quality metrics not found for this deployment" });
    }
    
    res.json(metrics);
  } catch (err) {
    next(err);
  }
});

// Get code quality metrics for all deployments (for dashboard overview)
router.get("/", async (req, res, next) => {
  try {
    const metrics = await getAllSonarMetrics();
    res.json({ metrics });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
