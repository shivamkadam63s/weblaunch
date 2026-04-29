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
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

${bc ? `FROM base AS builder
COPY . .
RUN ${bc}

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app ./` : `COPY . .`}

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
  const { id, repoUrl, branch, stack, framework, buildCmd, startCmd, port, hasDockerfile } = deployment;
  const tmpDir = path.join(os.tmpdir(), `weblaunch-build-${id}`);

  try {
    onLog(`📥 Cloning repository: ${repoUrl}`);
    const git = simpleGit();
    await git.clone(repoUrl, tmpDir, ["--depth", "1", "--branch", branch || "main"]);

    // Write generated Dockerfile if user has none
    if (!hasDockerfile) {
      onLog(`🔧 Generating Dockerfile for ${stack}/${framework}`);
      const dockerfile = generateDockerfile(stack, framework, buildCmd, startCmd, port || 3000);
      await fs.writeFile(path.join(tmpDir, "Dockerfile"), dockerfile);
    } else {
      onLog("📄 Using repository's own Dockerfile");
    }

    const imageName = `weblaunch/${deployment.name}:${id.slice(0, 8)}`;
    onLog(`🐳 Building Docker image: ${imageName}`);

    await new Promise((resolve, reject) => {
      docker.buildImage({ context: tmpDir, src: ["."] }, { t: imageName }, (err, stream) => {
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

    onLog(`✅ Docker image built: ${imageName}`);
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
