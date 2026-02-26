output "cloud_run_url" {
  description = "Cloud Run service URL"
  value       = google_cloud_run_v2_service.app.uri
}

output "cloud_sql_connection_name" {
  description = "Cloud SQL connection name for --add-cloudsql-instances"
  value       = google_sql_database_instance.db.connection_name
}

output "artifact_registry_url" {
  description = "Artifact Registry image base URL"
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_name}"
}

output "workload_identity_provider" {
  description = "WIF provider resource name (use as GCP_WORKLOAD_IDENTITY_PROVIDER secret)"
  value       = google_iam_workload_identity_pool_provider.github.name
}

output "github_actions_service_account" {
  description = "GitHub Actions service account email (use as GCP_SERVICE_ACCOUNT secret)"
  value       = google_service_account.github_actions.email
}
