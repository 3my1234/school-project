import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";

type Params = { params: Promise<{ userId: string }> };

const resetSchema = z.object({
  password: z.string().min(6).optional(),
});

export async function POST(req: NextRequest, { params }: Params) {
  const actor = await getAuthUser();
  if (!actor || !hasRole(actor, [Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId } = await params;
  const body = await req.json().catch(() => ({}));
  const parsed = resetSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const temporaryPassword = parsed.data.password?.trim() || generateTemporaryPassword();
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(temporaryPassword) },
  });

  return NextResponse.json({
    data: {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      temporaryPassword,
    },
  });
}
