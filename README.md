# WebLaunch - Automated Website Deployment Platform

![WebLaunch Architecture & Dashboard]
WebLaunch is an end-to-end automated deployment platform designed to simplify the hosting and orchestration of web applications. It provides a seamless, "one-click" pipeline from GitHub repositories to a live, accessible Kubernetes environment, completely running locally using a unified Docker Compose stack.

## System Architecture

The WebLaunch platform is designed using a microservices-inspired architecture. The core components run as individual containers orchestrated by a root `docker-compose.yml` file.

1.  **Frontend Dashboard**: A React-based interface for users to submit repositories, view deployment statuses, and read logs.
2.  **Backend Orchestrator**: A Node.js API that handles Git cloning, container building, and Kubernetes manifest generation.
3.  **Task Queue**: Redis and Bull manage asynchronous, long-running deployment jobs.
4.  **Local Image Registry**: A local Docker registry (`registry:2`) acts as a bridge. The backend pushes built images here, and Kubernetes pulls from it.
5.  **Kubernetes Cluster (K3s)**: A lightweight K8s cluster running *inside* a Docker container, used to deploy and expose user applications.
6.  **Monitoring & Telemetry**: Prometheus scrapes metrics from Node Exporter (host) and cAdvisor (containers), which are visualized via Grafana.
7.  **Code Quality**: Integrated SonarQube pipeline for analyzing submitted codebases.

---

## Technology Stack: Theoretical & Practical Working

### 1. Frontend: React, Vite, Tailwind CSS
*   **Theoretical Perspective**: React utilizes a virtual DOM for efficient, declarative UI updates. Vite is a next-generation frontend build tool providing exceptionally fast Hot Module Replacement (HMR) during development and optimized rollups for production. Tailwind is a utility-first CSS framework enabling rapid, constraint-based styling directly within component markup.
*   **Practical Working**: The frontend is a Single Page Application (SPA) served by Nginx (when built). It communicates with the backend via REST API calls (Axios) for CRUD operations and relies on WebSockets (`socket.io-client`) to stream real-time logs and deployment status updates. It visualizes data using Recharts and manages state via React Query and standard hooks.

### 2. Backend API: Node.js, Express, Dockerode, K8s Client
*   **Theoretical Perspective**: Node.js offers an asynchronous, event-driven architecture, ideal for I/O-heavy operations like interacting with APIs, file systems, and databases. Express is a minimal routing framework.
*   **Practical Working**: The backend is the core engine. When a deployment is requested:
    1.  It clones the GitHub repository (`simple-git`).
    2.  It inspects the repository structure to detect the application stack (e.g., Node.js, static HTML).
    3.  It generates a tailored `Dockerfile` dynamically.
    4.  It communicates with the host's Docker daemon via `/var/run/docker.sock` using `dockerode` to build the image.
    5.  It tags and pushes the image to the local `registry`.
    6.  It uses `@kubernetes/client-node` to generate and apply K8s Deployments, Services, and Ingress manifests to the K3s cluster.

### 3. Orchestration & Containerization: Docker & K3s
*   **Theoretical Perspective**: Containerization (Docker) isolates applications and their dependencies into immutable units. Kubernetes is a container orchestration engine for automating deployment, scaling, and management. K3s is a CNCF-certified, stripped-down version of Kubernetes designed for edge computing and local environments.
*   **Practical Working**: Instead of requiring a standalone Minikube installation, WebLaunch runs `rancher/k3s` directly as a service in the `docker-compose` stack. The K3s container runs in privileged mode and shares the docker socket. It reads from the `registry:5000` to pull newly built user applications. Traefik (bundled with K3s) acts as the Ingress controller, routing traffic from `.localhost` hostnames directly to the deployed pods.

### 4. Job Queue & State: Redis & Bull
*   **Theoretical Perspective**: Redis is an advanced, in-memory key-value data store used for caching and message brokering. Bull is a robust queue system built on top of Redis, handling distributed, asynchronous job processing.
*   **Practical Working**: Building Docker images and provisioning Kubernetes resources are blocking operations that can take minutes. To keep the API responsive, the Node.js backend pushes deployment tasks to a Bull queue. Worker processes pick up these jobs, process them in the background, and emit state changes via WebSockets.

### 5. Monitoring & Telemetry: Prometheus, Grafana, cAdvisor, Node Exporter
*   **Theoretical Perspective**: Prometheus is a time-series database that uses a pull model to gather metrics. Grafana is a powerful observability platform for creating visual dashboards. cAdvisor provides container-level usage data, while Node Exporter provides machine-level hardware metrics.
*   **Practical Working**: WebLaunch includes a built-in observability stack. Prometheus scrapes the `/metrics` endpoints of the Node Exporter and cAdvisor. Grafana is configured with pre-provisioned data sources and dashboards (like `platform.json` and `deployments.json`). Users can instantly monitor CPU, memory, and network usage of both the host system and the deployed Kubernetes pods without any manual setup.

### 6. Code Quality Analysis: SonarQube
*   **Theoretical Perspective**: SonarQube is a static application security testing (SAST) and code quality platform that detects bugs, vulnerabilities, and code smells continuously.
*   **Practical Working**: WebLaunch features a non-blocking integration with a SonarQube scanner. During the deployment pipeline, a parallel job uses `sonar-scanner` to analyze the cloned repository. The results are stored (via `pgClient`) and surfaced in the frontend `CodeQuality.jsx` dashboard, allowing developers to review code health alongside their deployments.

---

## Setup & Installation

### Prerequisites
*   Windows/Linux/macOS with **Docker Desktop** (or Docker Engine) installed and running.
*   Node.js (v18+) for local development (optional, as everything runs in Docker).
*   Ensure ports `80`, `443`, `3000`, `3001`, `3002`, `4000`, `5000`, `6379`, `6443`, `8080`, `9090`, and `9100` are available on your host.

### Quick Start (Automated Environment)
The entire platform is orchestrated via Docker Compose, eliminating the need to install Kubernetes or internal tools locally.

1.  **Clone the WebLaunch repository:**
    ```bash
    git clone https://github.com/ShivamKadam63s/WebLaunch.git
    cd WebLaunch
    ```

2.  **Start the entire platform stack:**
    ```bash
    docker-compose up --build -d
    ```
    *This command will build the frontend, backend, and spin up K3s, Redis, the Registry, Prometheus, and Grafana in the background.*

3.  **Access the Platform:**
    *   **Frontend Dashboard:** `http://localhost:3002`
    *   **Backend API:** `http://localhost:4000`
    *   **Grafana Dashboards:** `http://localhost:3001` (No login required)
    *   **Prometheus:** `http://localhost:9090`

### Deploying a Repository
1. Navigate to the Frontend Dashboard (`http://localhost:3002`).
2. Enter the URL of a public GitHub repository (e.g., a React app, an Express server, or a static website).
3. WebLaunch will automatically detect the stack, build the container, deploy it to the internal K3s cluster, and provide you with a live `.localhost` URL to view your application!

## Branching & Contribution
*   **`main` branch**: Contains the stable release and the combined Docker Compose architecture.
*   **Feature branches** (e.g., `code-quality`): Contain active development for specific modules.

## License
MIT License
