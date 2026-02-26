resource "google_artifact_registry_repository" "app" {
  repository_id = var.repository_name
  location      = var.region
  format        = "DOCKER"
  description   = "Docker images for ${var.service_name}"
}
