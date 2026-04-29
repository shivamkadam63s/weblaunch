# 🚀 WebLaunch — Automated Website Deployment Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker)](docker-compose.yml)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-Orchestrated-326CE5?logo=kubernetes)](k8s/)
[![Terraform](https://img.shields.io/badge/Infra-Terraform-7B42BC?logo=terraform)](terraform/)
[![Grafana](https://img.shields.io/badge/Monitoring-Grafana-F46800?logo=grafana)](monitoring/)

WebLaunch is a **production-grade automated deployment platform** that lets you deploy any GitHub repository with a single URL. It intelligently detects the technology stack, containerizes the application, and orchestrates it on Kubernetes — all monitored via Prometheus and Grafana.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔍 **Auto Stack Detection** | Detects Node.js, Python, Go, Rust, Java, Ruby, Static — 16+ frameworks |
| 🐳 **Auto Dockerization** | Generates optimized, multi-stage Dockerfiles automatically |
| ☸️ **Kubernetes Orchestration** | Deployments, Services, HPA, Ingress — production-ready |
| 📊 **Real-time Monitoring** | Prometheus metrics + Grafana dashboards + alert rules |
| 🔴 **Live Log Streaming** | WebSocket-based real-time deployment log viewer |
| 🔁 **One-click Redeploy** | Re-deploy any version with a single click |
| 🏗️ **Infra as Code** | Full Terraform (AWS EKS, VPC, ECR) + Ansible automation |
| ⚡ **Redis Job Queue** | Bull-powered async deployment queue (concurrency: 2) |

---

## 📁 Project Structure

```
WebLaunch/
├── backend/                      # Node.js / Express API
│   ├── src/
│   │   ├── index.js              # Entry point (Express + Socket.IO)
│   │   ├── routes/
│   │   │   ├── deploy.js         # POST /api/deployments
│   │   │   ├── status.js         # GET  /api/status/:id
│   │   │   └── logs.js           # GET  /api/logs/:id
│   │   ├── services/
│   │   │   ├── repoAnalyzer.js   # GitHub clone + stack detection
│   │   │   ├── dockerBuilder.js  # Dockerfile generation + image build
│   │   │   ├── k8sManager.js     # Kubernetes deployment management
│   │   │   ├── deploymentQueue.js # Bull queue setup
│   │   │   ├── deploymentWorker.js# Queue processor (build→deploy)
│   │   │   ├── deploymentStore.js # Redis-backed state store
│   │   │   └── redisClient.js    # Redis connection
│   │   ├── middleware/
│   │   │   ├── errorHandler.js
│   │   │   └── auth.js
│   │   └── utils/
│   │       └── logger.js         # Winston logger
│   ├── Dockerfile
│   └── package.json
│
├── frontend/                     # React + Vite + Tailwind CSS
│   ├── src/
│   │   ├── App.jsx               # Router
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx     # Deployments overview
│   │   │   ├── Deploy.jsx        # New deployment form
│   │   │   ├── DeploymentDetail.jsx # Logs + status
│   │   │   └── Monitoring.jsx    # Metrics charts
│   │   ├── components/
│   │   │   ├── common/           # Layout, StatusBadge, StackIcon, Spinner
│   │   │   ├── deploy/           # DeployForm, LogViewer
│   │   │   └── monitoring/       # MetricsChart (Recharts)
│   │   ├── hooks/
│   │   │   └── useDeployments.js # React Query hooks
│   │   └── utils/
│   │       ├── api.js            # Axios API client
│   │       └── socket.js         # Socket.IO client
│   ├── nginx.conf
│   └── Dockerfile
│
├── k8s/                          # Kubernetes manifests
│   └── base/
│       ├── namespace.yml
│       ├── backend-deployment.yml
│       ├── frontend-deployment.yml
│       ├── redis.yml
│       ├── ingress.yml
│       └── hpa.yml               # HorizontalPodAutoscaler
│
├── terraform/                    # Infrastructure as Code (AWS)
│   ├── main.tf                   # Root module (VPC, EKS, ECR, Monitoring)
│   ├── variables.tf
│   ├── outputs.tf
│   └── modules/
│       ├── vpc/                  # VPC, subnets, NAT gateway
│       ├── eks/                  # EKS cluster + node groups + IAM
│       ├── ecr/                  # ECR repositories with lifecycle policies
│       └── monitoring/           # Helm: kube-prometheus-stack
│
├── ansible/                      # Configuration management
│   ├── ansible.cfg
│   ├── inventory/
│   │   ├── hosts.yml
│   │   └── group_vars/all.yml
│   ├── playbooks/
│   │   ├── site.yml              # Full setup playbook
│   │   └── deploy-app.yml        # Rolling deployment
│   └── roles/
│       ├── common/               # OS setup, sysctl, user creation
│       ├── docker/               # Docker CE installation + daemon config
│       ├── kubernetes/           # kubeadm, kubelet, kubectl, Helm
│       └── monitoring/           # Prometheus + Grafana via Docker
│
├── monitoring/
│   ├── prometheus/
│   │   ├── prometheus.yml        # Scrape configs (backend, node, cAdvisor)
│   │   └── rules/alerts.yml      # Alert rules (CPU, Memory, Backend Down)
│   └── grafana/
│       ├── dashboards/weblaunch.json  # Pre-built dashboard
│       └── provisioning/         # Auto-provision datasources + dashboards
│
├── scripts/
│   ├── setup.sh                  # Local dev setup
│   ├── deploy-k8s.sh             # Deploy to K8s cluster
│   └── terraform-apply.sh        # Terraform plan/apply/destroy
│
├── docker-compose.yml            # Full stack (Frontend, Backend, Redis, Prometheus, Grafana, cAdvisor)
├── .env.example
├── .gitignore
└── README.md
```

---

## 🚀 Quick Start (Docker Compose)

### Prerequisites

- Docker ≥ 24.0
- Docker Compose ≥ 2.20
- Node.js ≥ 18 (for local development)
- Git

### 1. Clone & Configure

```bash
git clone https://github.com/yourname/weblaunch.git
cd WebLaunch
cp .env.example .env
# Edit .env if needed (defaults work for local dev)
```

### 2. Run Setup Script

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh dev
```

### 3. Start Everything

```bash
docker compose up -d
```

### 4. Access Services

| Service     | URL                          | Credentials     |
|-------------|------------------------------|-----------------|
| Frontend    | http://localhost:3000        | —               |
| Backend API | http://localhost:4000        | —               |
| Grafana     | http://localhost:3001        | admin / admin123|
| Prometheus  | http://localhost:9090        | —               |

---

## 🏗️ Deploy to AWS (Terraform + Ansible)

### 1. Provision Infrastructure

```bash
# Set AWS credentials
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export AWS_DEFAULT_REGION=us-east-1

# Create S3 bucket for state (once)
aws s3 mb s3://weblaunch-terraform-state

# Plan and apply
./scripts/terraform-apply.sh plan  dev
./scripts/terraform-apply.sh apply dev
```

### 2. Configure Servers with Ansible

```bash
cd ansible

# Install roles
ansible-galaxy install -r requirements.yml

# Update inventory/hosts.yml with your server IPs

# Run full setup
ansible-playbook playbooks/site.yml -i inventory/hosts.yml

# Deploy application
ansible-playbook playbooks/deploy-app.yml -i inventory/hosts.yml
```

### 3. Deploy to Kubernetes

```bash
# Get kubeconfig from EKS
aws eks update-kubeconfig --name weblaunch-dev --region us-east-1

# Apply manifests
./scripts/deploy-k8s.sh <your-ecr-registry> latest
```

---

## 🔌 API Reference

### Deploy a Repository

```http
POST /api/deployments
Content-Type: application/json

{
  "repoUrl":     "https://github.com/user/my-app",
  "branch":      "main",
  "replicas":    2,
  "projectName": "my-app",
  "envVars":     { "NODE_ENV": "production", "PORT": "3000" }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deploymentId": "uuid",
    "name":         "my-app",
    "stack":        "nodejs",
    "framework":    "nextjs",
    "status":       "queued"
  }
}
```

### Get Deployment Status

```http
GET /api/deployments/:id
GET /api/status/:id
GET /api/logs/:id
```

### Delete / Redeploy

```http
DELETE /api/deployments/:id
POST   /api/deployments/:id/redeploy
```

### Prometheus Metrics

```http
GET /metrics   → prom-client default + custom weblaunch_* metrics
```

---

## 🔍 Supported Stacks

| Stack      | Frameworks Detected                              | Default Port |
|------------|--------------------------------------------------|-------------|
| **Node.js**| Next.js, React, Vue, Angular, Svelte, NestJS, Express | 3000   |
| **Python** | Django, FastAPI, Flask, generic Python           | 8000        |
| **Go**     | Any `go.mod` project                             | 8080        |
| **Rust**   | Any `Cargo.toml` project                         | 8080        |
| **Java**   | Spring Boot (Maven/Gradle)                       | 8080        |
| **Ruby**   | Ruby on Rails                                    | 3000        |
| **Static** | HTML/CSS/JS served via `serve`                   | 3000        |

---

## 📊 Monitoring

Prometheus scrapes:
- `/metrics` from the backend (prom-client)
- `node-exporter:9100` for host metrics
- `cadvisor:8080` for container metrics

Grafana auto-provisions:
- **WebLaunch Overview** dashboard (CPU, Memory, Container metrics, Backend status)
- Alert rules: High CPU (>85%), High Memory (>90%), Backend Down, High 5xx rate

---

## 🔐 Environment Variables

See `.env.example` for full list. Key variables:

| Variable                 | Default     | Description                        |
|--------------------------|-------------|------------------------------------|
| `API_KEY`                | (empty)     | Leave empty to disable auth in dev |
| `REDIS_PASSWORD`         | (empty)     | Redis auth password                |
| `GRAFANA_ADMIN_PASSWORD` | `admin123`  | **Change in production!**          |
| `K8S_NAMESPACE`          | `weblaunch` | Kubernetes namespace               |
| `NODE_ENV`               | `production`| Node environment                   |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m "Add amazing feature"`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

MIT © WebLaunch Contributors
