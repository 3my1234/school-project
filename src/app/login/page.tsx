"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid credentials");
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role as string | undefined;
    router.push(role === "STUDENT" ? "/dashboard/student" : "/dashboard/admin");
  }

  return (
    <Card className="mx-auto max-w-md">
      <h1 className="text-xl font-semibold">Sign In</h1>
      <p className="mt-1 text-sm text-slate-600">Use the credentials issued by your administrator.</p>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <Input type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <Input type="password" placeholder="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        <Button isLoading={loading} type="submit" className="w-full">
          Sign In
        </Button>
      </form>
    </Card>
  );
}
