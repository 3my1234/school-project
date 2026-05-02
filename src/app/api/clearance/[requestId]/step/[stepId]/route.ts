import { NextRequest, NextResponse } from "next/server";
import { Role, StepStatus } from "@prisma/client";
import { generateCertificateId } from "@/lib/certificate";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ requestId: string; stepId: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.FACULTY_ADMIN, Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, stepId } = await params;
  const body = await req.json().catch(() => ({}));
  const action = body?.action as "APPROVE" | "REJECT";
  const comment = (body?.comment as string | undefined)?.trim();

  if (!["APPROVE", "REJECT"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }
  if (action === "REJECT" && !comment) {
    return NextResponse.json({ error: "Comment is required when rejecting." }, { status: 400 });
  }

  const step = await prisma.clearanceStep.findFirst({
    where: { id: stepId, requestId },
    include: { request: true },
  });

  if (!step) return NextResponse.json({ error: "Step not found" }, { status: 404 });

  if (user.role === Role.FACULTY_ADMIN && user.departmentId !== step.departmentId) {
    return NextResponse.json({ error: "Forbidden for this department" }, { status: 403 });
  }

  const allStepsForOrderCheck = await prisma.clearanceStep.findMany({
    where: { requestId },
    orderBy: { order: "asc" },
  });

  if (step.order !== step.request.currentStep) {
    return NextResponse.json({ error: "This step is not currently actionable." }, { status: 409 });
  }

  const priorStepsApproved = allStepsForOrderCheck
    .filter((s) => s.order < step.order)
    .every((s) => s.status === "APPROVED");

  if (!priorStepsApproved) {
    return NextResponse.json({ error: "Previous departments must approve first." }, { status: 409 });
  }

  const nextStatus: StepStatus = action === "APPROVE" ? "APPROVED" : "REJECTED";

  const result = await prisma.$transaction(async (tx) => {
    const updatedStep = await tx.clearanceStep.update({
      where: { id: step.id },
      data: {
        status: nextStatus,
        comment: comment ?? null,
        approverId: user.id,
        timestamp: new Date(),
      },
    });

    if (nextStatus === "REJECTED") {
      const requestUpdate = await tx.clearanceRequest.update({
        where: { id: requestId },
        data: { status: "REJECTED", comments: comment ?? "Rejected by department" },
      });
      return { updatedStep, requestUpdate };
    }

    const allSteps = await tx.clearanceStep.findMany({
      where: { requestId },
      orderBy: { order: "asc" },
    });

    const firstPending = allSteps.find((s) => s.status === "PENDING");
    const allApproved = allSteps.every((s) => s.status === "APPROVED");
    const issuedAt = new Date();

    const requestUpdate = await tx.clearanceRequest.update({
      where: { id: requestId },
      data: allApproved
        ? {
            status: "APPROVED",
            currentStep: allSteps.length,
            certificateId:
              step.request.certificateId ??
              generateCertificateId(step.request.id, step.request.studentId, issuedAt),
            certificateIssuedAt: issuedAt,
          }
        : {
            status: "PENDING",
            currentStep: firstPending?.order ?? step.request.currentStep,
            comments: null,
          },
    });

    return { updatedStep, requestUpdate };
  });

  return NextResponse.json({ data: result });
}
