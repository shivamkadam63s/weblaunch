const { getRedis } = require("./redisClient");
const logger = require("../utils/logger");

const PREFIX = "deployment:";
const INDEX_KEY = "deployments:index";

async function saveDeployment(deployment) {
  const redis = getRedis();
  await redis.set(`${PREFIX}${deployment.id}`, JSON.stringify(deployment));
  await redis.zadd(INDEX_KEY, Date.now(), deployment.id);
}

async function getDeployment(id) {
  const redis = getRedis();
  const data = await redis.get(`${PREFIX}${id}`);
  return data ? JSON.parse(data) : null;
}

async function updateDeployment(id, updates) {
  const existing = await getDeployment(id);
  if (!existing) return;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  const redis = getRedis();
  await redis.set(`${PREFIX}${id}`, JSON.stringify(updated));
  return updated;
}

async function listDeployments({ page = 1, limit = 10, status } = {}) {
  const redis = getRedis();
  const total = await redis.zcard(INDEX_KEY);
  const start = (page - 1) * limit;
  const ids = await redis.zrevrange(INDEX_KEY, start, start + limit - 1);
  const deployments = await Promise.all(ids.map(id => getDeployment(id)));
  const filtered = status ? deployments.filter(d => d && d.status === status) : deployments.filter(Boolean);
  return { deployments: filtered, total, page, limit, totalPages: Math.ceil(total / limit) };
}

async function deleteDeployment(id) {
  const redis = getRedis();
  await redis.del(`${PREFIX}${id}`);
  await redis.del(`${PREFIX}${id}:logs`);
  await redis.zrem(INDEX_KEY, id);
}

async function appendLog(id, log) {
  const redis = getRedis();
  await redis.rpush(`${PREFIX}${id}:logs`, JSON.stringify(log));
  await redis.ltrim(`${PREFIX}${id}:logs`, -1000, -1); // keep last 1000
}

async function getDeploymentLogs(id, { since, limit = 500 } = {}) {
  const redis = getRedis();
  const raw = await redis.lrange(`${PREFIX}${id}:logs`, -limit, -1);
  const logs = raw.map(r => JSON.parse(r));
  return since ? logs.filter(l => new Date(l.timestamp) > new Date(since)) : logs;
}

module.exports = { saveDeployment, getDeployment, updateDeployment, listDeployments, deleteDeployment, appendLog, getDeploymentLogs };
