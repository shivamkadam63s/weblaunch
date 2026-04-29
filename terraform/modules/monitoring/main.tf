provider "kubernetes" {
  host                   = var.cluster_endpoint
  cluster_ca_certificate = base64decode(var.cluster_ca)
  token                  = var.cluster_token
}

provider "helm" {
  kubernetes {
    host                   = var.cluster_endpoint
    cluster_ca_certificate = base64decode(var.cluster_ca)
    token                  = var.cluster_token
  }
}

resource "helm_release" "prometheus_stack" {
  name             = "kube-prometheus-stack"
  repository       = "https://prometheus-community.github.io/helm-charts"
  chart            = "kube-prometheus-stack"
  namespace        = "monitoring"
  create_namespace = true
  version          = "55.5.0"

  values = [yamlencode({
    grafana = {
      adminPassword = var.grafana_admin_password
      persistence   = { enabled = true, size = "5Gi" }
    }
    prometheus = {
      prometheusSpec = {
        retention           = "15d"
        storageSpec         = { volumeClaimTemplate = { spec = { resources = { requests = { storage = "10Gi" } } } } }
        additionalScrapeConfigs = [{
          job_name = "weblaunch-backend"
          static_configs = [{ targets = ["weblaunch-backend.weblaunch.svc.cluster.local:4000"] }]
          metrics_path = "/metrics"
        }]
      }
    }
  })]
}

output "grafana_url"     { value = "http://grafana.monitoring.svc.cluster.local" }
variable "cluster_endpoint" { sensitive = true }
variable "cluster_ca"       { sensitive = true }
variable "cluster_token"    { sensitive = true }
variable "environment"      {}
variable "grafana_admin_password" { sensitive = true; default = "admin123" }
