import Link from "next/link";
import { getServerSession } from "next-auth";
import { Card } from "@/components/ui/card";
import { authOptions } from "@/lib/auth-options";

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  const role = session?.user?.role;
  const dashboardPath = role === "STUDENT" ? "/dashboard/student" : role ? "/dashboard/admin" : null;

  return (
    <section
      className="relative left-1/2 right-1/2 -mx-[50vw] min-h-screen w-screen bg-cover bg-center"
      style={{ backgroundImage: "url('/images/veritas.webp')" }}
    >
      <div className="absolute inset-0 bg-slate-950/55" />
      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl border-white/20 bg-white/90 text-center backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-slate-900">Veritas University Clearance Platform</h1>
          <p className="mt-3 text-sm text-slate-700">
            Official departmental clearance portal for students and faculty administrators.
          </p>
          {dashboardPath ? (
            <Link className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" href={dashboardPath}>
              Go to Dashboard
            </Link>
          ) : (
            <Link className="mt-5 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" href="/login">
              Go to Login
            </Link>
          )}
        </Card>
      </div>
    </section>
  );
}
