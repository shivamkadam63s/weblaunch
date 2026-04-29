#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
#  Deploy WebLaunch to Kubernetes
#  Usage: ./scripts/deploy-k8s.sh <registry> <tag>
# ─────────────────────────────────────────────────────────

REGISTRY="${1:-}"
TAG="${2:-latest}"
NAMESPACE="weblaunch"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
K8S_DIR="$(dirname "$SCRIPT_DIR")/k8s"

log()  { echo "[+] $1"; }
err()  { echo "[✗] $1" >&2; exit 1; }

command -v kubectl &>/dev/null || err "kubectl is required"

log "Creating namespace: $NAMESPACE"
kubectl apply -f "$K8S_DIR/base/namespace.yml"

log "Applying base manifests..."
kubectl apply -f "$K8S_DIR/base/"

if [ -n "$REGISTRY" ]; then
  log "Updating image tags to $REGISTRY with tag $TAG..."
  kubectl set image deployment/weblaunch-backend  backend="${REGISTRY}/weblaunch/backend:${TAG}"  -n "$NAMESPACE"
  kubectl set image deployment/weblaunch-frontend frontend="${REGISTRY}/weblaunch/frontend:${TAG}" -n "$NAMESPACE"
fi

log "Waiting for rollout..."
kubectl rollout status deployment/weblaunch-backend  -n "$NAMESPACE" --timeout=300s
kubectl rollout status deployment/weblaunch-frontend -n "$NAMESPACE" --timeout=300s

log "✅ Kubernetes deployment complete!"
kubectl get pods -n "$NAMESPACE"
