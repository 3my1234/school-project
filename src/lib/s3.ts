import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_BUCKET_NAME;

let s3: S3Client | null = null;

function getS3() {
  if (!region) throw new Error("AWS_REGION is missing");
  if (!bucket) throw new Error("AWS_BUCKET_NAME is missing");
  if (!s3) {
    s3 = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });
  }
  return s3;
}

function sanitizeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function createPresignedUpload(args: {
  requestId: string;
  stepId: string;
  userId: string;
  fileName: string;
  fileType: string;
}) {
  const safeName = sanitizeName(args.fileName);
  const key = `clearance/${args.requestId}/${args.stepId}/${args.userId}/${Date.now()}-${randomUUID()}-${safeName}`;

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: args.fileType,
  });

  const uploadUrl = await getSignedUrl(getS3(), command, { expiresIn: 900 });
  const fileUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

  return { uploadUrl, key, fileUrl };
}

export async function createPresignedDownloadByKey(key: string, expiresInSeconds = 600) {
  if (!bucket) throw new Error("AWS_BUCKET_NAME is missing");
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(getS3(), command, { expiresIn: expiresInSeconds });
}
