import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.FACULTY_ADMIN, Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departmentId = req.nextUrl.searchParams.get("departmentId") || user.departmentId;
  if (!departmentId && user.role !== Role.SUPER_ADMIN) {
    return NextResponse.json({ error: "Department required" }, { status: 400 });
  }

  const pendingSteps = await prisma.clearanceStep.findMany({
    where: {
      departmentId: departmentId ?? undefined,
      status: "PENDING",
      request: { status: "PENDING" },
    },
    include: {
      department: true,
      documents: { orderBy: { createdAt: "desc" } },
      request: {
        include: {
          student: { select: { id: true, name: true, email: true } },
          documents: {
            orderBy: { createdAt: "desc" },
            include: {
              step: {
                include: { department: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const actionable = pendingSteps.filter((step) => step.request.currentStep === step.order);

  return NextResponse.json({ data: actionable });
}
