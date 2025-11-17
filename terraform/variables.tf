variable "project_id" {
  description = "The GCP project ID"
  type        = string
  default     = "armodelshare-478207"
}

variable "region" {
  description = "The GCP region for resources"
  type        = string
  default     = "europe-west3"
}

variable "service_name" {
  description = "The name of the Cloud Run service"
  type        = string
  default     = "armodelshare"
}

variable "container_image" {
  description = "The container image to deploy"
  type        = string
  default     = "gcr.io/armodelshare-478207/armodelshare:latest"
}

variable "memory" {
  description = "Memory limit for the Cloud Run service"
  type        = string
  default     = "512Mi"
}

variable "cpu" {
  description = "CPU limit for the Cloud Run service"
  type        = string
  default     = "1"
}

variable "min_instances" {
  description = "Minimum number of instances"
  type        = number
  default     = 0
}

variable "max_instances" {
  description = "Maximum number of instances"
  type        = number
  default     = 10
}
