import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateTemporaryPassword, hashPassword } from "@/lib/password";

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum([Role.STUDENT, Role.FACULTY_ADMIN, Role.SUPER_ADMIN]),
  departmentId: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
});

export async function GET() {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: { select: { id: true, name: true } },
      createdAt: true,
    },
  });
  return NextResponse.json({ data: { departments, users } });
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.SUPER_ADMIN])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const { name, email, role } = parsed.data;
  const departmentId = parsed.data.departmentId ?? null;
  const temporaryPassword = parsed.data.password?.trim() || generateTemporaryPassword();

  if (role === Role.FACULTY_ADMIN && !departmentId) {
    return NextResponse.json({ error: "Department is required for departmental admin users." }, { status: 400 });
  }
  if (role !== Role.FACULTY_ADMIN && departmentId) {
    return NextResponse.json({ error: "Department can only be assigned to departmental admin users." }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 });
  }

  const createdUser = await prisma.user.create({
    data: {
      name,
      email,
      role,
      departmentId,
      passwordHash: hashPassword(temporaryPassword),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    data: {
      user: createdUser,
      temporaryPassword,
    },
  });
}
