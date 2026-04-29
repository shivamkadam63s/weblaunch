const Bull = require("bull");
const logger = require("../utils/logger");

const redisConfig = {
  host: process.env.REDIS_HOST || "localhost",
  port: parseInt(process.env.REDIS_PORT || "6379"),
  password: process.env.REDIS_PASSWORD || undefined,
};

const deploymentQueue = new Bull("deployments", { redis: redisConfig, defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } } });

deploymentQueue.on("error", (err) => logger.error("Queue error:", err));
deploymentQueue.on("failed", (job, err) => logger.error(`Job ${job.id} failed:`, err.message));

module.exports = { deploymentQueue };
