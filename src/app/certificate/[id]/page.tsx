import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";

type Props = { params: Promise<{ id: string }> };

export default async function CertificatePage({ params }: Props) {
  const { id } = await params;

  const requestRecord = await prisma.clearanceRequest.findFirst({
    where: { certificateId: id, status: "APPROVED" },
    include: {
      student: true,
      steps: { include: { department: true }, orderBy: { order: "asc" } },
    },
  });

  if (!requestRecord) return notFound();

  const verifyUrl = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify/${id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl);

  return (
    <Card className="mx-auto max-w-3xl border-2 border-slate-300 bg-white p-10">
      <p className="text-center text-xs uppercase tracking-[0.2em] text-slate-500">Official Document</p>
      <h1 className="mt-2 text-center text-3xl font-bold text-slate-900">Departmental Clearance Certificate</h1>
      <p className="mt-6 text-center text-slate-700">This certifies that</p>
      <p className="mt-2 text-center text-2xl font-semibold">{requestRecord.student.name}</p>
      <p className="mt-2 text-center text-slate-700">has successfully completed all required clearance steps.</p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div>
          <p className="text-sm text-slate-500">Certificate ID</p>
          <p className="font-mono text-sm font-semibold">{id}</p>
          <p className="mt-3 text-sm text-slate-500">Issued</p>
          <p className="text-sm">{requestRecord.certificateIssuedAt?.toISOString().slice(0, 10)}</p>
        </div>
        <div className="flex justify-center md:justify-end">
          <img src={qrDataUrl} alt="Certificate QR" className="h-36 w-36 rounded border" />
        </div>
      </div>
    </Card>
  );
}