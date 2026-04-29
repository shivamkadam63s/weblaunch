const Redis = require("ioredis");
const logger = require("../utils/logger");

let client = null;

async function initRedis() {
  client = new Redis({
    host: process.env.REDIS_HOST || "localhost",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    password: process.env.REDIS_PASSWORD || undefined,
    retryStrategy: (times) => Math.min(times * 50, 2000),
    lazyConnect: true,
  });
  await client.connect();
  client.on("error", (err) => logger.error("Redis error:", err));
}

function getRedis() {
  if (!client) throw new Error("Redis not initialized");
  return client;
}

module.exports = { initRedis, getRedis };
