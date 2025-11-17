output "service_url" {
  description = "The URL of the deployed Cloud Run service"
  value       = google_cloud_run_v2_service.armodelshare.uri
}

output "service_name" {
  description = "The name of the Cloud Run service"
  value       = google_cloud_run_v2_service.armodelshare.name
}

output "storage_bucket_name" {
  description = "The name of the GCS storage bucket"
  value       = google_storage_bucket.armodel_storage.name
}

output "service_account_email" {
  description = "The email of the Cloud Run service account"
  value       = google_service_account.cloud_run_sa.email
}
