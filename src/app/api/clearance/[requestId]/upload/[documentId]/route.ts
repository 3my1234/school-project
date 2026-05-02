import { NextRequest, NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ requestId: string; documentId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.STUDENT])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, documentId } = await params;

  const document = await prisma.clearanceDocument.findFirst({
    where: {
      id: documentId,
      requestId,
      uploadedById: user.id,
      request: { studentId: user.id },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  await prisma.clearanceDocument.delete({ where: { id: document.id } });

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const user = await getAuthUser();
  if (!user || !hasRole(user, [Role.STUDENT])) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId, documentId } = await params;

  const document = await prisma.clearanceDocument.findFirst({
    where: {
      id: documentId,
      requestId,
      uploadedById: user.id,
      request: { studentId: user.id },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const fileUrl = (body?.fileUrl as string | undefined)?.trim();
  const fileKey = (body?.fileKey as string | undefined)?.trim();
  const fileName = (body?.fileName as string | undefined)?.trim();
  const mimeType = (body?.mimeType as string | undefined)?.trim();
  const note = (body?.note as string | undefined)?.trim();

  if (!fileUrl) {
    return NextResponse.json({ error: "fileUrl is required" }, { status: 400 });
  }

  const updated = await prisma.clearanceDocument.update({
    where: { id: document.id },
    data: {
      fileUrl,
      fileKey: fileKey ?? null,
      fileName: fileName ?? null,
      mimeType: mimeType ?? null,
      note: note ?? document.note,
    },
  });

  return NextResponse.json({ data: updated });
}