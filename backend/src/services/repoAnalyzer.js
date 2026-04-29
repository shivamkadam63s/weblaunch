const fs = require("fs-extra");
const path = require("path");
const simpleGit = require("simple-git");
const os = require("os");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

const DETECTION_RULES = [
  { name:"Next.js",       stack:"nodejs",  framework:"nextjs",     check:(f,p,r)=>p&&(p.dependencies?.next||p.devDependencies?.next),                                         buildCmd:"npm run build",                                              startCmd:"npm start",                                   port:3000 },
  { name:"React (CRA)",   stack:"nodejs",  framework:"react",      check:(f,p,r)=>p&&(p.dependencies?.["react-scripts"]||p.devDependencies?.["react-scripts"]),               buildCmd:"npm run build",                                              startCmd:"npx serve -s build -l 3000",                  port:3000 },
  { name:"Vue.js",        stack:"nodejs",  framework:"vue",        check:(f,p,r)=>p&&(p.dependencies?.vue||p.devDependencies?.["@vue/cli-service"]),                          buildCmd:"npm run build",                                              startCmd:"npx serve -s dist -l 3000",                   port:3000 },
  { name:"Angular",       stack:"nodejs",  framework:"angular",    check:(f,p,r)=>p&&(p.dependencies?.["@angular/core"]||p.devDependencies?.["@angular/cli"]),                buildCmd:"npm run build -- --configuration production",                startCmd:"npx serve -s dist -l 3000",                   port:3000 },
  { name:"Svelte",        stack:"nodejs",  framework:"svelte",     check:(f,p,r)=>p&&(p.dependencies?.svelte||p.devDependencies?.svelte),                                    buildCmd:"npm run build",                                              startCmd:"node build",                                  port:3000 },
  { name:"NestJS",        stack:"nodejs",  framework:"nestjs",     check:(f,p,r)=>p&&(p.dependencies?.["@nestjs/core"]||p.devDependencies?.["@nestjs/cli"]),                  buildCmd:"npm run build",                                              startCmd:"node dist/main",                              port:3000 },
  { name:"Express.js",    stack:"nodejs",  framework:"express",    check:(f,p,r)=>p&&p.dependencies?.express,                                                                 buildCmd:null,                                                         startCmd:"npm start",                                   port:3000 },
  { name:"Node.js",       stack:"nodejs",  framework:"nodejs",     check:(f,p,r)=>p!==null||f.includes("package.json"),                                                       buildCmd:null,                                                         startCmd:"npm start",                                   port:3000 },
  { name:"Django",        stack:"python",  framework:"django",     check:(f,p,r)=>f.includes("manage.py"),                                                                    buildCmd:"pip install -r requirements.txt && python manage.py migrate", startCmd:"gunicorn wsgi:application --bind 0.0.0.0:8000",port:8000 },
  { name:"FastAPI",       stack:"python",  framework:"fastapi",    check:(f,p,r)=>r.includes("fastapi"),                                                                      buildCmd:"pip install -r requirements.txt",                             startCmd:"uvicorn main:app --host 0.0.0.0 --port 8000", port:8000 },
  { name:"Flask",         stack:"python",  framework:"flask",      check:(f,p,r)=>r.includes("flask")||f.includes("app.py"),                                                 buildCmd:"pip install -r requirements.txt",                             startCmd:"gunicorn app:app --bind 0.0.0.0:8000",        port:8000 },
  { name:"Python",        stack:"python",  framework:"python",     check:(f,p,r)=>f.includes("requirements.txt")||f.includes("Pipfile"),                                     buildCmd:"pip install -r requirements.txt",                             startCmd:"python main.py",                              port:8000 },
  { name:"Go",            stack:"go",      framework:"go",         check:(f,p,r)=>f.includes("go.mod")||f.includes("main.go"),                                               buildCmd:"go build -o app .",                                           startCmd:"./app",                                       port:8080 },
  { name:"Rust",          stack:"rust",    framework:"rust",       check:(f,p,r)=>f.includes("Cargo.toml"),                                                                   buildCmd:"cargo build --release",                                       startCmd:"./target/release/app",                        port:8080 },
  { name:"Spring Boot",   stack:"java",    framework:"springboot", check:(f,p,r)=>f.includes("pom.xml")||f.some(x=>x.endsWith(".gradle")),                                   buildCmd:"mvn clean package -DskipTests",                               startCmd:"java -jar target/*.jar",                      port:8080 },
  { name:"Ruby on Rails", stack:"ruby",    framework:"rails",      check:(f,p,r)=>f.includes("Gemfile"),                                                                      buildCmd:"bundle install && rails assets:precompile",                   startCmd:"rails server -b 0.0.0.0 -p 3000",            port:3000 },
  { name:"Static HTML",   stack:"static",  framework:"static",     check:(f,p,r)=>f.includes("index.html")||f.some(x=>x.endsWith(".html")),                                  buildCmd:null,                                                          startCmd:"npx serve -l 3000",                           port:3000 },
];

async function analyzeRepository(repoUrl, branch) {
  const tmpDir = path.join(os.tmpdir(), `weblaunch-analyze-${uuidv4()}`);
  try {
    logger.info(`Cloning ${repoUrl}${branch ? `@${branch}` : ''}`);
    const git = simpleGit();
    const cloneOptions = ["--depth", "1"];
    if (branch) cloneOptions.push("--branch", branch);
    await git.clone(repoUrl, tmpDir, cloneOptions);
    const files = await getAllFiles(tmpDir);
    const relFiles = files.map(f => path.relative(tmpDir, f).replace(/\\/g, "/"));
    let pkg = null;
    const pkgPath = path.join(tmpDir, "package.json");
    if (await fs.pathExists(pkgPath)) pkg = await fs.readJson(pkgPath).catch(() => null);
    let requirements = [];
    const reqPath = path.join(tmpDir, "requirements.txt");
    if (await fs.pathExists(reqPath)) {
      const reqContent = await fs.readFile(reqPath, "utf8");
      requirements = reqContent.split("\n").map(l => l.trim().split(/[>=<!/]/)[0].toLowerCase()).filter(Boolean);
    }
    const hasDockerfile = await fs.pathExists(path.join(tmpDir, "Dockerfile"));
    const hasDockerCompose = await fs.pathExists(path.join(tmpDir, "docker-compose.yml")) || await fs.pathExists(path.join(tmpDir, "docker-compose.yaml"));
    const detected = detectStack(relFiles, pkg, requirements);

    // Refine start command for Node.js
    if (detected.stack === "nodejs" && pkg) {
      const startScript = pkg.scripts?.start || "";
      const buildScript = pkg.scripts?.build || "";

      // If `npm start` chains a build (e.g. "npm run build && node scripts/start.js")
      // split into separate buildCmd + startCmd so the Dockerfile can multi-stage
      if (startScript && startScript.includes("&&")) {
        const parts = startScript.split("&&").map(s => s.trim());
        // Everything except the last part is a build step
        const buildParts = parts.slice(0, -1);
        const runPart = parts[parts.length - 1];

        // Normalise: "npm run build" → "npm run build", "node scripts/start.js" kept as-is
        detected.buildCmd = buildParts.join(" && ");
        detected.startCmd = runPart;
      } else if (startScript) {
        // `npm start` is a single command — keep as-is, no separate buildCmd needed
        detected.startCmd = "npm start";
        // But if there's a separate build script that build tools need, flag it
        if (!detected.buildCmd && buildScript && (
          buildScript.includes("webpack") ||
          buildScript.includes("vite") ||
          buildScript.includes("rollup") ||
          buildScript.includes("parcel") ||
          buildScript.includes("gulp")
        )) {
          detected.buildCmd = "npm run build";
        }
      } else if (pkg.main && (await fs.pathExists(path.join(tmpDir, pkg.main)))) {
        detected.startCmd = `node ${pkg.main}`;
      } else {
        const commonEntries = ["index.js", "server.js", "app.js", "src/index.js", "src/server.js"];
        for (const entry of commonEntries) {
          if (await fs.pathExists(path.join(tmpDir, entry))) {
            detected.startCmd = `node ${entry}`;
            break;
          }
        }
      }
    }

    return { ...detected, hasDockerfile, hasDockerCompose, files: relFiles.slice(0, 50), totalFiles: relFiles.length, packageJson: pkg ? { name: pkg.name, version: pkg.version, scripts: pkg.scripts } : null };
  } finally {
    await fs.remove(tmpDir).catch(() => {});
  }
}

function detectStack(files, pkg, requirements) {
  for (const rule of DETECTION_RULES) {
    try { if (rule.check(files, pkg, requirements || [])) return { stack: rule.stack, framework: rule.framework, name: rule.name, buildCmd: rule.buildCmd, startCmd: rule.startCmd, port: rule.port }; } catch(e) {}
  }
  return { stack: "static", framework: "static", name: "Static HTML", buildCmd: null, startCmd: "npx serve -l 3000", port: 3000 };
}

async function getAllFiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) { const nested = await getAllFiles(fullPath); files.push(...nested); }
    else files.push(fullPath);
  }
  return files;
}

module.exports = { analyzeRepository, detectStack };
