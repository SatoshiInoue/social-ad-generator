resource "google_cloud_run_v2_service" "app" {
  name     = var.service_name
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.cloud_run.email

    scaling {
      min_instance_count = 0
      max_instance_count = 5
    }

    containers {
      # Image is updated by the CI/CD workflow after terraform apply; placeholder used on first apply.
      image = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_name}/${var.service_name}:latest"

      resources {
        limits = {
          memory = "2Gi"
          cpu    = "1"
        }
      }

      ports {
        container_port = 8080
      }

      env {
        name  = "NODE_ENV"
        value = "production"
      }

      env {
        name  = "HOSTNAME"
        value = "0.0.0.0"
      }

      # All 12 app secrets injected from Secret Manager
      dynamic "env" {
        for_each = {
          DATABASE_URL           = "database-url"
          NEXTAUTH_URL           = "nextauth-url"
          NEXTAUTH_SECRET        = "nextauth-secret"
          GOOGLE_CLIENT_ID       = "google-client-id"
          GOOGLE_CLIENT_SECRET   = "google-client-secret"
          GITHUB_CLIENT_ID       = "github-client-id"
          GITHUB_CLIENT_SECRET   = "github-client-secret"
          AWS_REGION             = "aws-region"
          AWS_ACCESS_KEY_ID      = "aws-access-key-id"
          AWS_SECRET_ACCESS_KEY  = "aws-secret-access-key"
          AWS_S3_BUCKET          = "aws-s3-bucket"
          GOOGLE_GEMINI_API_KEY  = "google-gemini-api-key"
        }
        content {
          name = env.key
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.app[env.value].secret_id
              version = "latest"
            }
          }
        }
      }
    }

    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.db.connection_name]
      }
    }
  }

  depends_on = [
    google_secret_manager_secret.app,
    google_service_account.cloud_run,
    google_sql_database_instance.db,
  ]
}

# Allow unauthenticated public access
resource "google_cloud_run_service_iam_member" "public_invoker" {
  project  = var.project_id
  location = var.region
  service  = google_cloud_run_v2_service.app.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}
