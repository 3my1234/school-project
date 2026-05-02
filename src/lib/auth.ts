import { getServerSession } from "next-auth";
import { NextRequest } from "next/server";
import { Role } from "@prisma/client";
import { authOptions } from "@/lib/auth-options";

export type AuthUser = {
  id: string;
  role: Role;
  departmentId: string | null;
};

export async function getAuthUser(_req?: NextRequest): Promise<AuthUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;

  return {
    id: session.user.id,
    role: session.user.role,
    departmentId: session.user.departmentId,
  };
}

export function hasRole(user: AuthUser, roles: Role[]) {
  return roles.includes(user.role);
}
