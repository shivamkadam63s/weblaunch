#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
#  WebLaunch Setup Script
#  Usage: ./scripts/setup.sh [dev|prod]
# ─────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV="${1:-dev}"

GREEN="\033[0;32m"; YELLOW="\033[1;33m"; RED="\033[0;31m"; NC="\033[0m"
log()  { echo -e "${GREEN}[+]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1" >&2; exit 1; }

# Check dependencies
for cmd in docker docker-compose git node npm; do
  command -v "$cmd" &>/dev/null || err "$cmd is required but not installed"
done

log "Setting up WebLaunch (environment: $ENV)"

# Copy .env if missing
if [ ! -f "$ROOT_DIR/.env" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  warn "Created .env from .env.example — review and update it"
fi

# Install backend dependencies
log "Installing backend dependencies..."
cd "$ROOT_DIR/backend" && npm install --silent

# Install frontend dependencies
log "Installing frontend dependencies..."
cd "$ROOT_DIR/frontend" && npm install --silent

# Build Docker images
log "Building Docker images..."
cd "$ROOT_DIR"
docker compose build --parallel

log "✅ Setup complete!"
echo ""
echo "  Start everything:  docker compose up -d"
echo "  View logs:         docker compose logs -f"
echo "  Frontend:          http://localhost:3000"
echo "  Backend:           http://localhost:4000"
echo "  Grafana:           http://localhost:3001  (admin/admin123)"
echo "  Prometheus:        http://localhost:9090"
echo ""
echo "  🌐 Cloudflare Tunnel (Public Access):"
echo "  Wait for 'cloudflared' to start, then run:"
echo "  docker logs weblaunch-cloudflared 2>&1 | grep trycloudflare.com"
