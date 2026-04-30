require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");
const { collectDefaultMetrics, register } = require("prom-client");
const rateLimit = require("express-rate-limit");

const logger = require("./utils/logger");
const deployRoutes = require("./routes/deploy");
const statusRoutes = require("./routes/status");
const logsRoutes = require("./routes/logs");
const { router: metricsRouter } = require("./routes/metrics");
const { initRedis } = require("./services/redisClient");
const { initDb } = require("./services/pgClient");
const { initDeploymentWorker } = require("./services/deploymentWorker");
const { errorHandler } = require("./middleware/errorHandler");
const { authMiddleware } = require("./middleware/auth");

const app = express();
const server = http.createServer(app);

// Socket.IO for real-time log streaming
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Attach io to app for use in routes
app.set("io", io);

// Prometheus metrics (prefixed with weblaunch_)
// (collectDefaultMetrics is already called in routes/metrics.js or we can call it here)
// Actually we call it here to ensure it's on the global registry with prefix
require("prom-client").collectDefaultMetrics({ prefix: "weblaunch_" });

// ─── Middleware ───────────────────────────────────────────────────────────────
app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
app.use(morgan("combined", { stream: { write: (msg) => logger.info(msg.trim()) } }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting disabled for debugging
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 1000,
//   standardHeaders: true,
//   legacyHeaders: false,
// });
// app.use("/api/", limiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "1.0.0" })
);

app.use("/api/deployments", deployRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/logs", logsRoutes);
app.use("/api/code-quality", require("./routes/sonar"));
app.use("/metrics", metricsRouter);

// 404 handler
app.use((req, res) => res.status(404).json({ error: "Route not found" }));

// Error handler
app.use(errorHandler);

// ─── Socket.IO Events ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  socket.on("subscribe:deployment", (deploymentId) => {
    socket.join(`deployment:${deploymentId}`);
    logger.info(`Socket ${socket.id} subscribed to deployment ${deploymentId}`);
  });

  socket.on("unsubscribe:deployment", (deploymentId) => {
    socket.leave(`deployment:${deploymentId}`);
  });

  socket.on("disconnect", () => {
    logger.info(`Client disconnected: ${socket.id}`);
  });
});

// ─── Bootstrap ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function bootstrap() {
  try {
    await initDb();
    
    await initRedis();
    logger.info("Redis connected");

    await initDeploymentWorker(io);
    logger.info("Deployment worker initialized");

    server.listen(PORT, () => {
      logger.info(`WebLaunch API running on port ${PORT}`);
    });
  } catch (err) {
    logger.error("Failed to start server:", err);
    process.exit(1);
  }
}

bootstrap();

module.exports = { app, server };
