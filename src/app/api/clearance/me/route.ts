import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.STUDENT])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestRecord = await prisma.clearanceRequest.findFirst({
    where: { studentId: user.id },
    orderBy: { createdAt: "desc" },
    include: {
      steps: { include: { department: true, documents: { orderBy: { createdAt: "desc" } } }, orderBy: { order: "asc" } },
      documents: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json({ data: requestRecord });
}
