import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ certificateId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { certificateId } = await params;

  const requestRecord = await prisma.clearanceRequest.findFirst({
    where: {
      certificateId,
      status: "APPROVED",
    },
    include: {
      student: { select: { id: true, name: true, email: true } },
      steps: { include: { department: true }, orderBy: { order: "asc" } },
    },
  });

  if (!requestRecord) {
    return NextResponse.json({ valid: false, message: "Certificate not found" }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    certificateId,
    issuedAt: requestRecord.certificateIssuedAt,
    student: requestRecord.student,
    steps: requestRecord.steps.map((step) => ({
      department: step.department.name,
      status: step.status,
      timestamp: step.timestamp,
    })),
  });
}