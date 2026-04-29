resource "aws_eks_cluster" "main" {
  name     = var.cluster_name
  role_arn = aws_iam_role.eks_cluster.arn
  version  = "1.28"

  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_public_access  = true
    endpoint_private_access = true
  }

  depends_on = [aws_iam_role_policy_attachment.eks_cluster_policy]
  tags = { Name = var.cluster_name }
}

resource "aws_eks_node_group" "main" {
  cluster_name    = aws_eks_cluster.main.name
  node_group_name = "${var.cluster_name}-nodes"
  node_role_arn   = aws_iam_role.eks_node.arn
  subnet_ids      = var.subnet_ids
  instance_types  = var.node_group_config.instance_types

  scaling_config {
    desired_size = var.node_group_config.desired_size
    min_size     = var.node_group_config.min_size
    max_size     = var.node_group_config.max_size
  }

  update_config { max_unavailable = 1 }
  depends_on = [aws_iam_role_policy_attachment.eks_node_policy, aws_iam_role_policy_attachment.eks_cni_policy, aws_iam_role_policy_attachment.ecr_read_only]
}

# IAM roles (abbreviated)
resource "aws_iam_role" "eks_cluster" {
  name               = "${var.cluster_name}-cluster-role"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "eks.amazonaws.com" } }] })
}

resource "aws_iam_role" "eks_node" {
  name               = "${var.cluster_name}-node-role"
  assume_role_policy = jsonencode({ Version = "2012-10-17", Statement = [{ Action = "sts:AssumeRole", Effect = "Allow", Principal = { Service = "ec2.amazonaws.com" } }] })
}

resource "aws_iam_role_policy_attachment" "eks_cluster_policy" { policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy";     role = aws_iam_role.eks_cluster.name }
resource "aws_iam_role_policy_attachment" "eks_node_policy"    { policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy";   role = aws_iam_role.eks_node.name }
resource "aws_iam_role_policy_attachment" "eks_cni_policy"     { policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy";       role = aws_iam_role.eks_node.name }
resource "aws_iam_role_policy_attachment" "ecr_read_only"      { policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"; role = aws_iam_role.eks_node.name }

output "cluster_name"         { value = aws_eks_cluster.main.name }
output "cluster_endpoint"     { value = aws_eks_cluster.main.endpoint; sensitive = true }
output "cluster_ca_certificate" { value = aws_eks_cluster.main.certificate_authority[0].data; sensitive = true }
output "cluster_token"        { value = aws_eks_cluster.main.name; sensitive = true }

variable "cluster_name"       {}
variable "vpc_id"             {}
variable "subnet_ids"         { type = list(string) }
variable "node_group_config"  { type = object({ instance_types = list(string), desired_size = number, min_size = number, max_size = number }) }
variable "environment"        {}
