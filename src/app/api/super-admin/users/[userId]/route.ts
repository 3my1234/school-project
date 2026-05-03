import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ userId: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const actor = await getAuthUser();
  if (!actor || !hasRole(actor, [Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  if (actor.id === userId) {
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.clearanceStep.updateMany({
      where: { approverId: userId },
      data: { approverId: null },
    }),
    prisma.clearanceDocument.deleteMany({
      where: { uploadedById: userId },
    }),
    prisma.clearanceRequest.deleteMany({
      where: { studentId: userId },
    }),
    prisma.user.delete({ where: { id: userId } }),
  ]);

  return NextResponse.json({ success: true });
}
