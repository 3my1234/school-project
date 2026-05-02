import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ requestId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { requestId } = await params;

  const requestRecord = await prisma.clearanceRequest.findUnique({
    where: { id: requestId },
    include: {
      student: { select: { id: true, name: true, email: true } },
      steps: {
        include: {
          department: true,
          approver: { select: { id: true, name: true, email: true } },
        },
        orderBy: { order: "asc" },
      },
      documents: true,
    },
  });

  if (!requestRecord) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = requestRecord.studentId === user.id;
  const isAdmin = hasRole(user, [Role.FACULTY_ADMIN, Role.SUPER_ADMIN]);

  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ data: requestRecord });
}