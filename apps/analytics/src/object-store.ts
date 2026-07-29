// Shared MinIO/S3 client config for export-worker.ts (upload) and index.ts
// (presigned download URLs). MinIO speaks the S3 API, so the AWS SDK works
// against it unchanged with forcePathStyle + a custom endpoint.
import { S3Client } from "@aws-sdk/client-s3"

export const EXPORT_BUCKET = process.env.EXPORT_BUCKET || "quiz-exports"

let sharedClient: S3Client | null = null

export function getObjectStoreClient(): S3Client {
  if (!sharedClient) {
    sharedClient = new S3Client({
      endpoint: process.env.S3_ENDPOINT || "http://localhost:9000",
      region: process.env.S3_REGION || "us-east-1",
      forcePathStyle: true,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "minioadmin",
        secretAccessKey: process.env.S3_SECRET_KEY || "minioadmin",
      },
    })
  }
  return sharedClient
}
