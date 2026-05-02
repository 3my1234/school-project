"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { LogoutButton } from "@/components/auth/logout-button";

export function TopNavAuth() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;
  if (!session?.user) return null;

  const role = session.user.role;
  const dashboardPath = role === "STUDENT" ? "/dashboard/student" : "/dashboard/admin";

  return (
    <div className="flex items-center gap-2">
      <Link
        href={dashboardPath}
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Dashboard
      </Link>
      <LogoutButton />
    </div>
  );
}
