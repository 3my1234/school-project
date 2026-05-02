import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { getAuthUser, hasRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPresignedDownloadByKey } from "@/lib/s3";

type Params = { params: Promise<{ documentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { documentId } = await params;

  const document = await prisma.clearanceDocument.findUnique({
    where: { id: documentId },
    include: {
      request: {
        select: { studentId: true },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  const canViewAsOfficial = hasRole(user, [Role.FACULTY_ADMIN, Role.SUPER_ADMIN]);
  const canViewAsOwner = user.role === Role.STUDENT && document.request.studentId === user.id;

  if (!canViewAsOfficial && !canViewAsOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!document.fileKey) {
    return NextResponse.redirect(document.fileUrl);
  }

  try {
    const signedUrl = await createPresignedDownloadByKey(document.fileKey, 600);
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate access URL" },
      { status: 500 }
    );
  }
}