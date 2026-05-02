import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPresignedUpload } from "@/lib/s3";

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.STUDENT])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const requestId = String(body?.requestId || "").trim();
  const stepId = String(body?.stepId || "").trim();
  const fileName = String(body?.fileName || "").trim();
  const fileType = String(body?.fileType || "application/octet-stream").trim();

  if (!requestId || !stepId || !fileName) {
    return NextResponse.json({ error: "requestId, stepId and fileName are required" }, { status: 400 });
  }

  const step = await prisma.clearanceStep.findFirst({
    where: {
      id: stepId,
      requestId,
      request: { studentId: user.id },
    },
  });

  if (!step) {
    return NextResponse.json({ error: "Step not found" }, { status: 404 });
  }

  try {
    const presigned = await createPresignedUpload({
      requestId,
      stepId,
      userId: user.id,
      fileName,
      fileType,
    });
    return NextResponse.json({ data: presigned });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "S3 configuration error" },
      { status: 500 }
    );
  }
}
