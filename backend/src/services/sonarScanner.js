const scanner = require("sonarqube-scanner").default; // Or require("sonarqube-scanner") depending on version
const axios = require("axios");
const path = require("path");
const logger = require("../utils/logger");
const { saveSonarMetrics } = require("./pgClient");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs-extra");
const simpleGit = require("simple-git");
const os = require("os");

const SONAR_URL = process.env.SONAR_URL || "http://sonarqube:9000";
const SONAR_LOGIN = process.env.SONAR_LOGIN || "admin";
const SONAR_PASSWORD = process.env.SONAR_PASSWORD || "admin"; 
// Note: In a production environment, use a generated token, but for automation simplicity we can use admin/admin or create a token via API.

/**
 * Trigger SonarQube scan and wait for results.
 * This should run asynchronously so it doesn't block the deployment.
 */
async function runSonarScan(deployment) {
  const { id, repoUrl, branch } = deployment;
  const projectKey = `weblaunch-${id}`;
  const tmpDir = path.join(os.tmpdir(), `weblaunch-sonar-${uuidv4()}`);

  try {
    logger.info(`[SonarQube] Starting background analysis for deployment ${id}`);
    
    // 1. Clone repository to a temporary directory specifically for scanning
    const git = simpleGit();
    const cloneOptions = ["--depth", "1"];
    if (branch) cloneOptions.push("--branch", branch);
    await git.clone(repoUrl, tmpDir, cloneOptions);

    // 2. Run sonarqube-scanner
    logger.info(`[SonarQube] Running scanner for ${projectKey}...`);
    
    await new Promise((resolve, reject) => {
      // In sonarqube-scanner v3+, it exports a function directly or via .default
      const scanFn = typeof scanner === "function" ? scanner : scanner.default;
      if (!scanFn) return reject(new Error("sonarqube-scanner is not a function"));

      scanFn(
        {
          serverUrl: SONAR_URL,
          token: process.env.SONAR_TOKEN || "", // Use token if available
          options: {
            "sonar.projectKey": projectKey,
            "sonar.projectName": `Deployment ${id}`,
            "sonar.sources": ".",
            // Only scan common web languages and infra files
            "sonar.inclusions": "**/*.js,**/*.ts,**/*.jsx,**/*.tsx,**/*.html,**/*.css,**/*.py,**/*.go,**/*.java,**/*.rb,Dockerfile,docker-compose.yml,**/*.yaml,**/*.yml",
            "sonar.exclusions": "**/node_modules/**,**/dist/**,**/build/**,**/.git/**",
            "sonar.login": SONAR_LOGIN,
            "sonar.password": SONAR_PASSWORD,
          },
        },
        () => {
          logger.info(`[SonarQube] Scanner completed for ${projectKey}`);
          resolve();
        }
      );
    });

    // 3. Polling for analysis to be processed by SonarQube Server
    logger.info(`[SonarQube] Waiting for analysis report to be processed...`);
    await new Promise(r => setTimeout(r, 5000)); // Initial wait

    let taskStatus = "PENDING";
    let retries = 0;
    while (taskStatus !== "SUCCESS" && retries < 12) { // Wait up to 60s
      try {
        const res = await axios.get(`${SONAR_URL}/api/ce/component?component=${projectKey}`, {
          auth: { username: SONAR_LOGIN, password: SONAR_PASSWORD }
        });
        const currentTask = res.data.current;
        if (currentTask) {
          taskStatus = currentTask.status;
          if (taskStatus === "FAILED" || taskStatus === "CANCELED") {
            throw new Error(`Background task failed with status ${taskStatus}`);
          }
        } else {
          // Task might be already finished and cleaned up from current, check metrics instead
          break;
        }
      } catch (err) {
        // Ignored, might be a 404 if project just created or task finished
      }
      if (taskStatus !== "SUCCESS") {
        await new Promise(r => setTimeout(r, 5000));
        retries++;
      }
    }

    // 4. Fetch metrics
    logger.info(`[SonarQube] Fetching metrics for ${projectKey}...`);
    const metricsRes = await axios.get(`${SONAR_URL}/api/measures/component`, {
      params: {
        component: projectKey,
        metricKeys: "bugs,vulnerabilities,code_smells,security_hotspots,alert_status"
      },
      auth: { username: SONAR_LOGIN, password: SONAR_PASSWORD }
    });

    const measures = metricsRes.data.component.measures;
    const getVal = (key) => {
      const m = measures.find(m => m.metric === key);
      return m ? (m.value || m.period?.value || 0) : 0;
    };

    const metrics = {
      deploymentId: id,
      repoUrl: repoUrl,
      bugs: parseInt(getVal("bugs"), 10) || 0,
      vulnerabilities: parseInt(getVal("vulnerabilities"), 10) || 0,
      codeSmells: parseInt(getVal("code_smells"), 10) || 0,
      securityHotspots: parseInt(getVal("security_hotspots"), 10) || 0,
      qualityGateStatus: getVal("alert_status") === "OK" ? "PASSED" : (getVal("alert_status") || "UNKNOWN")
    };

    // 5. Store in PostgreSQL
    await saveSonarMetrics(metrics);
    logger.info(`[SonarQube] Metrics saved for deployment ${id}. Quality Gate: ${metrics.qualityGateStatus}`);

  } catch (err) {
    logger.error(`[SonarQube] Analysis failed for ${id}: ${err.message}`);
  } finally {
    // Cleanup temporary directory
    await fs.remove(tmpDir).catch(() => {});
  }
}

module.exports = {
  runSonarScan
};
