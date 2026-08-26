import "server-only";

import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getServerEnv } from "@/server/env";

let client: S3Client | undefined;

function getClient() {
  if (!client) {
    const env = getServerEnv();
    client = new S3Client({
      region: "auto",
      endpoint: env.R2_S3_API,
      credentials: {
        accessKeyId: env.R2_ACCESS_KEY_ID,
        secretAccessKey: env.R2_ACCESS_SECRET_KEY,
      },
    });
  }
  return client;
}

export function getR2ObjectUrl(objectKey: string) {
  const env = getServerEnv();
  const publicUrl = new URL(env.R2_PUBLIC_URL);
  let basePath = publicUrl.pathname.replace(/\/$/, "");

  // The public r2.dev endpoint is shared across buckets, so it expects the
  // bucket name as the first path segment. Custom domains can map directly to
  // a bucket and should keep their configured path unchanged.
  if (!basePath && publicUrl.hostname.endsWith(".r2.dev")) {
    basePath = `/${encodeURIComponent(env.R2_BUCKET_NAME)}`;
  }

  const keyPath = objectKey.split("/").map(encodeURIComponent).join("/");
  return `${publicUrl.origin}${basePath}/${keyPath}`;
}

export async function createR2PutUrl(objectKey: string, contentType: string) {
  const env = getServerEnv();
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey, ContentType: contentType }),
    { expiresIn: 300 },
  );
}

export async function headR2Object(objectKey: string) {
  const env = getServerEnv();
  return getClient().send(new HeadObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey }));
}

export async function putR2Object(objectKey: string, body: Uint8Array, contentType: string) {
  const env = getServerEnv();
  await getClient().send(new PutObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey, Body: body, ContentType: contentType }));
}

export async function deleteR2Object(objectKey: string) {
  const env = getServerEnv();
  await getClient().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET_NAME, Key: objectKey }));
}
