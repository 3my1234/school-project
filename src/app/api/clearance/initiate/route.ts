import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEPARTMENT_ORDER = ["Library", "Bursary", "Sports", "HOD"];

export async function POST() {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.STUDENT])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.clearanceRequest.findFirst({
    where: { studentId: user.id, status: { in: ["PENDING", "REJECTED"] } },
  });

  if (existing) {
    return NextResponse.json({ error: "You already have an active clearance request." }, { status: 409 });
  }

  const departments = await prisma.department.findMany();
  const orderedDepartments = DEPARTMENT_ORDER.map((name) =>
    departments.find((department) => department.name.toLowerCase() === name.toLowerCase())
  ).filter(Boolean);

  if (orderedDepartments.length !== DEPARTMENT_ORDER.length) {
    return NextResponse.json(
      { error: "Required departments missing. Ensure Library, Bursary, Sports, and HOD exist." },
      { status: 400 }
    );
  }

  const requestRecord = await prisma.clearanceRequest.create({
    data: {
      studentId: user.id,
      status: "PENDING",
      currentStep: 0,
      steps: {
        create: orderedDepartments.map((department, index) => ({
          departmentId: department!.id,
          order: index,
          status: "PENDING",
        })),
      },
    },
    include: {
      steps: {
        include: { department: true },
        orderBy: { order: "asc" },
      },
    },
  });

  return NextResponse.json({ data: requestRecord }, { status: 201 });
}
