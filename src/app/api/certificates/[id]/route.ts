import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.STUDENT, Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const requestRecord = await prisma.clearanceRequest.findUnique({
    where: { id },
    include: { steps: true },
  });

  if (!requestRecord) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.role === "STUDENT" && requestRecord.studentId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const allApproved = requestRecord.steps.every((step) => step.status === "APPROVED");
  if (!allApproved) {
    return NextResponse.json({ error: "All steps must be approved first." }, { status: 409 });
  }

  return NextResponse.json({
    data: {
      certificateId: requestRecord.certificateId,
      url: `/certificate/${requestRecord.certificateId}`,
    },
  });
}