import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthProviders } from "@/components/auth/providers";
import { TopNavAuth } from "@/components/auth/top-nav-auth";

export const metadata: Metadata = {
  title: "Departmental Clearance System",
  description: "University Micro-SaaS Clearance Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProviders>
          <main className="mx-auto min-h-screen max-w-5xl px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
              <Link href="/" className="text-sm font-semibold text-slate-800">
                Departmental Clearance System
              </Link>
              <TopNavAuth />
            </div>
            {children}
          </main>
        </AuthProviders>
      </body>
    </html>
  );
}
