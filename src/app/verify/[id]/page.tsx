import { Card } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

export default async function VerifyPage({ params }: Props) {
  const { id } = await params;

  const res = await fetch(`${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/verify/${id}`, {
    cache: "no-store",
  });

  const json = await res.json();

  return (
    <Card className="mx-auto max-w-2xl">
      <h1 className="text-xl font-semibold">Certificate Verification</h1>
      {json.valid ? (
        <div className="mt-3 space-y-2 text-sm">
          <p className="text-emerald-700">Verified and authentic.</p>
          <p>Student: {json.student.name}</p>
          <p>Certificate ID: {json.certificateId}</p>
          <p>Issued: {String(json.issuedAt).slice(0, 10)}</p>
        </div>
      ) : (
        <p className="mt-3 text-red-700">Invalid certificate.</p>
      )}
    </Card>
  );
}