-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'FACULTY_ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "StepStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "departmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearanceRequest" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "comments" TEXT,
    "certificateId" TEXT,
    "certificateIssuedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClearanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearanceStep" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "status" "StepStatus" NOT NULL DEFAULT 'PENDING',
    "approverId" TEXT,
    "comment" TEXT,
    "timestamp" TIMESTAMP(3),
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClearanceStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClearanceDocument" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClearanceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Department_name_key" ON "Department"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ClearanceRequest_certificateId_key" ON "ClearanceRequest"("certificateId");

-- CreateIndex
CREATE INDEX "ClearanceRequest_studentId_idx" ON "ClearanceRequest"("studentId");

-- CreateIndex
CREATE INDEX "ClearanceRequest_status_idx" ON "ClearanceRequest"("status");

-- CreateIndex
CREATE INDEX "ClearanceStep_requestId_idx" ON "ClearanceStep"("requestId");

-- CreateIndex
CREATE INDEX "ClearanceStep_departmentId_idx" ON "ClearanceStep"("departmentId");

-- CreateIndex
CREATE INDEX "ClearanceStep_status_idx" ON "ClearanceStep"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ClearanceStep_requestId_departmentId_key" ON "ClearanceStep"("requestId", "departmentId");

-- CreateIndex
CREATE INDEX "ClearanceDocument_requestId_idx" ON "ClearanceDocument"("requestId");

-- CreateIndex
CREATE INDEX "ClearanceDocument_uploadedById_idx" ON "ClearanceDocument"("uploadedById");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceRequest" ADD CONSTRAINT "ClearanceRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceStep" ADD CONSTRAINT "ClearanceStep_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ClearanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceStep" ADD CONSTRAINT "ClearanceStep_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceStep" ADD CONSTRAINT "ClearanceStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceDocument" ADD CONSTRAINT "ClearanceDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ClearanceRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClearanceDocument" ADD CONSTRAINT "ClearanceDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
