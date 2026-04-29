const express = require("express");
const Joi = require("joi");
const { v4: uuidv4 } = require("uuid");
const router = express.Router();

const logger = require("../utils/logger");
const { deploymentQueue } = require("../services/deploymentQueue");
const { getDeployment, listDeployments, deleteDeployment } = require("../services/deploymentStore");
const { analyzeRepository } = require("../services/repoAnalyzer");

// ─── Validation Schemas ───────────────────────────────────────────────────────
const deploySchema = Joi.object({
  repoUrl: Joi.string()
    .uri({ scheme: ["http", "https"] })
    .pattern(/github\.com/)
    .required()
    .messages({
      "string.pattern.base": "Only GitHub repository URLs are supported",
      "string.uri": "Must be a valid URL",
    }),
  branch: Joi.string().default("main"),
  envVars: Joi.object().pattern(Joi.string(), Joi.string()).default({}),
  replicas: Joi.number().integer().min(1).max(10).default(1),
  projectName: Joi.string()
    .pattern(/^[a-z0-9-]+$/)
    .min(3)
    .max(50)
    .optional(),
});

// ─── GET /api/deployments ─────────────────────────────────────────────────────
router.get("/", async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const deployments = await listDeployments({ page: +page, limit: +limit, status });
    res.json({ success: true, data: deployments });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/deployments ────────────────────────────────────────────────────
router.post("/", async (req, res, next) => {
  try {
    const { error, value } = deploySchema.validate(req.body);
    if (error) {
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    const { repoUrl, branch, envVars, replicas, projectName } = value;

    // Pre-analyze repo to get stack info before queuing
    logger.info(`Analyzing repository: ${repoUrl}`);
    const analysis = await analyzeRepository(repoUrl, branch);

    const deploymentId = uuidv4();
    const name =
      projectName ||
      repoUrl
        .split("/")
        .pop()
        .replace(/\.git$/, "")
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-");

    const deployment = {
      id: deploymentId,
      name,
      repoUrl,
      branch,
      envVars,
      replicas,
      stack: analysis.stack,
      framework: analysis.framework,
      buildCmd: analysis.buildCmd,
      startCmd: analysis.startCmd,
      port: analysis.port,
      hasDockerfile: analysis.hasDockerfile,
      status: "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      logs: [],
    };

    // Add to deployment queue
    const job = await deploymentQueue.add("deploy", deployment, {
      jobId: deploymentId,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    });

    logger.info(`Deployment queued: ${deploymentId} for ${repoUrl}`);

    res.status(202).json({
      success: true,
      data: {
        deploymentId,
        jobId: job.id,
        name,
        stack: analysis.stack,
        framework: analysis.framework,
        status: "queued",
        message: `Deployment queued. Detected stack: ${analysis.stack} (${analysis.framework})`,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ─── GET /api/deployments/:id ─────────────────────────────────────────────────
router.get("/:id", async (req, res, next) => {
  try {
    const deployment = await getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ success: false, error: "Deployment not found" });
    }
    res.json({ success: true, data: deployment });
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /api/deployments/:id ─────────────────────────────────────────────
router.delete("/:id", async (req, res, next) => {
  try {
    const deployment = await getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ success: false, error: "Deployment not found" });
    }

    await deleteDeployment(req.params.id);
    logger.info(`Deployment deleted: ${req.params.id}`);
    res.json({ success: true, message: "Deployment deleted successfully" });
  } catch (err) {
    next(err);
  }
});

// ─── POST /api/deployments/:id/redeploy ──────────────────────────────────────
router.post("/:id/redeploy", async (req, res, next) => {
  try {
    const deployment = await getDeployment(req.params.id);
    if (!deployment) {
      return res.status(404).json({ success: false, error: "Deployment not found" });
    }

    const newDeploymentId = uuidv4();
    const redeployment = { ...deployment, id: newDeploymentId, status: "queued", createdAt: new Date().toISOString(), logs: [] };

    await deploymentQueue.add("deploy", redeployment, {
      jobId: newDeploymentId,
      attempts: 3,
    });

    res.status(202).json({ success: true, data: { deploymentId: newDeploymentId, status: "queued" } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
