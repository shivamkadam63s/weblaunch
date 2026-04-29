#!/usr/bin/env bash
set -euo pipefail

# Usage: ./scripts/terraform-apply.sh [plan|apply|destroy] [dev|prod]
ACTION="${1:-plan}"
ENV="${2:-dev}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TF_DIR="$(dirname "$SCRIPT_DIR")/terraform"

command -v terraform &>/dev/null || { echo "terraform not found"; exit 1; }

cd "$TF_DIR"
echo "[+] terraform init"
terraform init -upgrade

echo "[+] terraform $ACTION (env=$ENV)"
case "$ACTION" in
  plan)    terraform plan    -var="environment=$ENV" ;;
  apply)   terraform apply   -var="environment=$ENV" -auto-approve ;;
  destroy) terraform destroy -var="environment=$ENV" -auto-approve ;;
  *) echo "Unknown action: $ACTION"; exit 1 ;;
esac
