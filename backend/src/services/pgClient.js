const { Pool } = require("pg");
const logger = require("../utils/logger");

const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || "weblaunch",
  password: process.env.DB_PASSWORD || "weblaunch_secret",
  database: process.env.DB_NAME || "weblaunch",
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sonar_metrics (
        id SERIAL PRIMARY KEY,
        deployment_id VARCHAR(255) NOT NULL,
        repo_url TEXT NOT NULL,
        bugs INTEGER DEFAULT 0,
        vulnerabilities INTEGER DEFAULT 0,
        code_smells INTEGER DEFAULT 0,
        security_hotspots INTEGER DEFAULT 0,
        quality_gate_status VARCHAR(50) DEFAULT 'UNKNOWN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    logger.info("PostgreSQL database initialized for SonarQube metrics");
  } catch (err) {
    logger.error(`Failed to initialize PostgreSQL: ${err.message}`);
  }
}

async function saveSonarMetrics(data) {
  const query = `
    INSERT INTO sonar_metrics (deployment_id, repo_url, bugs, vulnerabilities, code_smells, security_hotspots, quality_gate_status)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *;
  `;
  const values = [
    data.deploymentId,
    data.repoUrl,
    data.bugs || 0,
    data.vulnerabilities || 0,
    data.codeSmells || 0,
    data.securityHotspots || 0,
    data.qualityGateStatus || "UNKNOWN",
  ];

  try {
    const res = await pool.query(query, values);
    return res.rows[0];
  } catch (err) {
    logger.error(`Failed to save Sonar metrics: ${err.message}`);
    throw err;
  }
}

async function getSonarMetricsByDeployment(deploymentId) {
  const query = `SELECT * FROM sonar_metrics WHERE deployment_id = $1 ORDER BY created_at DESC LIMIT 1;`;
  try {
    const res = await pool.query(query, [deploymentId]);
    return res.rows[0];
  } catch (err) {
    logger.error(`Failed to get Sonar metrics: ${err.message}`);
    throw err;
  }
}

async function getAllSonarMetrics() {
  const query = `
    SELECT DISTINCT ON (deployment_id) * 
    FROM sonar_metrics 
    ORDER BY deployment_id, created_at DESC;
  `;
  try {
    const res = await pool.query(query);
    return res.rows;
  } catch (err) {
    logger.error(`Failed to get all Sonar metrics: ${err.message}`);
    throw err;
  }
}

module.exports = {
  pool,
  initDb,
  saveSonarMetrics,
  getSonarMetricsByDeployment,
  getAllSonarMetrics,
};
