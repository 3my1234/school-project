import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ requestId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user || !hasRole(user, [Role.STUDENT])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await params;
  const body = await req.json().catch(() => ({}));

  const stepId = (body?.stepId as string | undefined)?.trim();
  const fileUrl = (body?.fileUrl as string | undefined)?.trim();
  const fileKey = (body?.fileKey as string | undefined)?.trim();
  const fileName = (body?.fileName as string | undefined)?.trim();
  const mimeType = (body?.mimeType as string | undefined)?.trim();
  const note = (body?.note as string | undefined)?.trim();

  if (!fileUrl || !stepId) {
    return NextResponse.json({ error: "stepId and fileUrl are required" }, { status: 400 });
  }

  const requestRecord = await prisma.clearanceRequest.findUnique({
    where: { id: requestId },
    include: { steps: { orderBy: { order: "asc" } } },
  });
  if (!requestRecord || requestRecord.studentId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const targetStep = requestRecord.steps.find((step) => step.id === stepId);
  if (!targetStep) {
    return NextResponse.json({ error: "Step does not belong to this request" }, { status: 400 });
  }

  const document = await prisma.clearanceDocument.create({
    data: {
      requestId,
      stepId,
      uploadedById: user.id,
      fileUrl,
      fileKey: fileKey ?? null,
      fileName: fileName ?? null,
      mimeType: mimeType ?? null,
      note,
    },
  });

  if (requestRecord.status === "REJECTED") {
    await prisma.$transaction([
      prisma.clearanceStep.update({
        where: { id: stepId },
        data: { status: "PENDING", comment: null },
      }),
      prisma.clearanceRequest.update({
        where: { id: requestId },
        data: { status: "PENDING", comments: null, currentStep: targetStep.order },
      }),
    ]);
  }

  return NextResponse.json({ data: document }, { status: 201 });
}
