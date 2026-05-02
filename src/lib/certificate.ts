import { createHash } from "crypto";

export function generateCertificateId(requestId: string, studentId: string, issuedAt: Date) {
  const seed = `${requestId}:${studentId}:${issuedAt.toISOString()}`;
  return createHash("sha256").update(seed).digest("hex").slice(0, 20).toUpperCase();
}
