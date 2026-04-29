const Docker = require("dockerode");
const fs = require("fs-extra");
const path = require("path");
const os = require("os");
const simpleGit = require("simple-git");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || "/var/run/docker.sock" });

/**
 * Generate a Dockerfile based on detected stack info.
 */
function generateDockerfile(stack, framework, buildCmd, startCmd, port) {
  const templates = {
    nodejs: (bc, sc, p) => `
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

${bc ? `FROM deps AS builder
COPY . .
RUN ${bc}

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app ./` : `FROM deps AS runner
WORKDIR /app
COPY . .`}

EXPOSE ${p}
ENV PORT=${p}
CMD ["sh", "-c", "${sc}"]
`.trim(),

    python: (bc, sc, p) => `
FROM python:3.11-slim
WORKDIR /app
COPY requirements*.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
${bc && !bc.includes("pip") ? `RUN ${bc}` : ""}
EXPOSE ${p}
ENV PORT=${p}
CMD ["sh", "-c", "${sc}"]
`.trim(),

    go: (bc, sc, p) => `
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o app .

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/app .
EXPOSE ${p}
CMD ["./app"]
`.trim(),

    rust: (bc, sc, p) => `
FROM rust:1.73 AS builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/app .
EXPOSE ${p}
CMD ["./app"]
`.trim(),

    java: (bc, sc, p) => `
FROM maven:3.9-eclipse-temurin-17 AS builder
WORKDIR /app
COPY pom.xml .
RUN mvn dependency:resolve
COPY src ./src
RUN mvn clean package -DskipTests

FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=builder /app/target/*.jar app.jar
EXPOSE ${p}
CMD ["java", "-jar", "app.jar"]
`.trim(),

    ruby: (bc, sc, p) => `
FROM ruby:3.2-alpine
RUN apk add --no-cache build-base nodejs yarn
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle install
COPY . .
${bc && !bc.includes("bundle") ? `RUN ${bc}` : ""}
EXPOSE ${p}
CMD ["sh", "-c", "${sc}"]
`.trim(),

    static: (bc, sc, p) => `
FROM node:20-alpine
RUN npm install -g serve
WORKDIR /app
COPY . .
EXPOSE ${p}
CMD ["serve", "-l", "${p}", "."]
`.trim(),
  };

  const tmpl = templates[stack] || templates.static;
  return tmpl(buildCmd, startCmd, port);
}

/**
 * Clone repo, write Dockerfile, build image, return imageName.
 */
async function buildImage(deployment, onLog) {
  const { id, repoUrl, branch, stack, framework, buildCmd, startCmd, port, rootDir, isFullStack, hasDockerfile } = deployment;
  const tmpDir = path.join(os.tmpdir(), `weblaunch-build-${id}`);

  try {
    onLog(`📥 Cloning repository: ${repoUrl}`);
    const git = simpleGit();
    const cloneOptions = ["--depth", "1"];
    if (branch) cloneOptions.push("--branch", branch);
    await git.clone(repoUrl, tmpDir, cloneOptions);

    // Smart Patch: If this is the WebLaunch repo or similar, fix the Nginx config to prevent crashes
    const nginxPath = path.join(tmpDir, rootDir || "", "nginx.conf");
    if (await fs.pathExists(nginxPath)) {
      onLog("🩹 Applying smart patch to nginx.conf for sidecar communication...");
      let content = await fs.readFile(nginxPath, "utf8");
      // Use direct localhost connection without resolver to avoid 502s
      // This handles both the /api/ and /socket.io/ proxy_pass lines
      content = content.replace(/proxy_pass http:\/\/backend:4000/g, "proxy_pass http://localhost:4000");
      await fs.writeFile(nginxPath, content);
    }

    // Determine if we should use an existing Dockerfile or generate one
    let effectiveDockerfile = null;
    const rootDirFull = path.join(tmpDir, rootDir || "");
    const rootDockerfile = path.join(tmpDir, "Dockerfile");
    const subDockerfile = rootDir ? path.join(rootDirFull, "Dockerfile") : null;

    if (subDockerfile && await fs.pathExists(subDockerfile)) {
      effectiveDockerfile = subDockerfile;
      onLog(`📄 Using Dockerfile found in /${rootDir}`);
    } else if (await fs.pathExists(rootDockerfile)) {
      effectiveDockerfile = rootDockerfile;
      onLog("📄 Using root Dockerfile");
    }

    if (!effectiveDockerfile) {
      onLog(`🔧 Generating Dockerfile for ${stack}/${framework}${rootDir ? ` (in /${rootDir})` : ""}`);
      const dockerfileContent = generateDockerfile(stack, framework, buildCmd, startCmd, port || 3000);
      effectiveDockerfile = path.join(rootDirFull, "Dockerfile");
      await fs.ensureDir(rootDirFull);
      await fs.writeFile(effectiveDockerfile, dockerfileContent);
    }

    // If we are using a Dockerfile inside a subfolder, we should use that folder as the build context
    // UNLESS it's the root Dockerfile, in which case we use tmpDir.
    const buildContext = (effectiveDockerfile === subDockerfile) ? rootDirFull : tmpDir;
    const dockerfilePath = path.relative(buildContext, effectiveDockerfile);

    const registryPrefix = "localhost:5000";
    const baseName = `${deployment.name}:${id.slice(0, 8)}`;
    const imageName = `${registryPrefix}/${baseName}`;
    
    onLog(`🐳 Building Frontend image: ${imageName}`);

    await new Promise((resolve, reject) => {
      docker.buildImage({ context: buildContext, src: ["."] }, { t: imageName, dockerfile: dockerfilePath, nocache: true }, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (buildErr, output) => {
          if (buildErr) return reject(buildErr);
          const errors = (output || []).filter(o => o.error).map(o => o.error);
          if (errors.length) return reject(new Error(errors.join("\n")));
          resolve(output);
        }, (event) => {
          if (event.stream) onLog(event.stream.trim());
        });
      });
    });

    if (isFullStack) {
      const backendImageName = `${imageName}-backend`;
      const backendDir = path.join(tmpDir, "backend");
      onLog(`🐳 Building Backend image: ${backendImageName}`);

      // Generate a simple Node.js Dockerfile for the backend if missing
      const backendDockerfile = path.join(backendDir, "Dockerfile");
      if (!await fs.pathExists(backendDockerfile)) {
        onLog("🔧 Generating default Dockerfile for backend sidecar");
        const content = `FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nEXPOSE 4000\nCMD ["npm", "start"]`;
        await fs.writeFile(backendDockerfile, content);
      }

      await new Promise((resolve, reject) => {
        docker.buildImage({ context: backendDir, src: ["."] }, { t: backendImageName, nocache: true }, (err, stream) => {
          if (err) return reject(err);
          docker.modem.followProgress(stream, (buildErr, output) => {
            if (buildErr) return reject(buildErr);
            const errors = (output || []).filter(o => o.error).map(o => o.error);
            if (errors.length) return reject(new Error(errors.join("\n")));
            resolve(output);
          }, (event) => {
            if (event.stream) onLog(`[backend] ${event.stream.trim()}`);
          });
        });
      });
      
      onLog(`📤 Pushing backend image to local registry...`);
      const backendImage = docker.getImage(backendImageName);
      await backendImage.push();
    }

    onLog(`📤 Pushing image to local registry...`);
    const image = docker.getImage(imageName);
    await new Promise((resolve, reject) => {
      image.push({}, (err, stream) => {
        if (err) return reject(err);
        docker.modem.followProgress(stream, (pushErr, output) => {
          if (pushErr) return reject(pushErr);
          resolve(output);
        });
      });
    });

    onLog(`✅ Docker image built and pushed: ${imageName}`);
    return imageName;
  } finally {
    await fs.remove(tmpDir).catch(() => {});
  }
}

async function removeImage(imageName) {
  try {
    const image = docker.getImage(imageName);
    await image.remove({ force: true });
    logger.info(`Removed image: ${imageName}`);
  } catch (e) {
    logger.warn(`Could not remove image ${imageName}: ${e.message}`);
  }
}

module.exports = { buildImage, generateDockerfile, removeImage };
