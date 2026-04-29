terraform {
  required_version = ">= 1.6.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.24"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.12"
    }
  }

  backend "s3" {
    bucket = "weblaunch-terraform-state"
    key    = "weblaunch/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "weblaunch"
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# ── VPC ───────────────────────────────────────────────────────
module "vpc" {
  source  = "./modules/vpc"
  name    = "weblaunch-${var.environment}"
  region  = var.aws_region
  environment = var.environment
}

# ── EKS Cluster ───────────────────────────────────────────────
module "eks" {
  source           = "./modules/eks"
  cluster_name     = "weblaunch-${var.environment}"
  vpc_id           = module.vpc.vpc_id
  subnet_ids       = module.vpc.private_subnet_ids
  node_group_config = var.node_group_config
  environment      = var.environment
  depends_on       = [module.vpc]
}

# ── ECR Repositories ──────────────────────────────────────────
module "ecr" {
  source      = "./modules/ecr"
  environment = var.environment
  repositories = ["weblaunch/backend", "weblaunch/frontend"]
}

# ── Monitoring (Prometheus + Grafana via Helm) ─────────────────
module "monitoring" {
  source           = "./modules/monitoring"
  cluster_endpoint = module.eks.cluster_endpoint
  cluster_ca       = module.eks.cluster_ca_certificate
  cluster_token    = module.eks.cluster_token
  environment      = var.environment
  depends_on       = [module.eks]
}
