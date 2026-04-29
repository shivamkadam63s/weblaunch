const express = require("express");
const router = express.Router();
const { getDeploymentLogs } = require("../services/deploymentStore");

// GET /api/logs/:id - Get deployment logs
router.get("/:id", async (req, res, next) => {
  try {
    const { since, limit = 500 } = req.query;
    const logs = await getDeploymentLogs(req.params.id, { since, limit: +limit });
    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
});

// GET /api/logs/:id/stream - SSE log stream
router.get("/:id/stream", async (req, res, next) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const deploymentId = req.params.id;
  const io = req.app.get("io");

  const sendLog = (log) => {
    res.write(`data: ${JSON.stringify(log)}\n\n`);
  };

  // Subscribe to Socket.IO room for this deployment
  io.to(`deployment:${deploymentId}`).emit("connected");

  const cleanup = () => {
    res.end();
  };

  req.on("close", cleanup);
});

module.exports = router;
