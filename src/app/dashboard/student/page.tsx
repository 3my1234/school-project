"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { ClearanceStepper } from "@/components/dashboard/clearance-stepper";

type ClearanceData = {
  id: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  certificateId: string | null;
  steps: Array<{
    id: string;
    order: number;
    status: "PENDING" | "APPROVED" | "REJECTED";
    comment: string | null;
    department: { name: string };
    documents: Array<{ id: string; fileUrl: string; fileKey: string | null; fileName: string | null; note: string | null }>;
  }>;
};

const REQUIRED_DOCUMENTS: Record<string, string[]> = {
  Library: ["Student ID Card", "Library Registration Slip", "Borrowed Books Clearance Evidence"],
  Bursary: ["School Fees Receipt", "Departmental Dues Receipt"],
  Sports: ["Sports Clearance Form"],
  HOD: ["Departmental Exit/Clearance Form"],
};

export default function StudentDashboardPage() {
  const [data, setData] = useState<ClearanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploading, setUploading] = useState(false);
  const [busyDocumentId, setBusyDocumentId] = useState<string | null>(null);
  const [docLabel, setDocLabel] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/clearance/me", { cache: "no-store" });
    const json = await res.json();
    setData(json.data ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function initiate() {
    await fetch("/api/clearance/initiate", { method: "POST" });
    load();
  }

  async function uploadForStep(stepId: string, files: FileList | File[]) {
    if (!data) return;
    const picked = Array.from(files);
    if (!picked.length) return;

    setUploading(true);
    setError("");
    setSuccess("");

    for (let i = 0; i < picked.length; i++) {
      const file = picked[i];
      const presignRes = await fetch("/api/upload/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: data.id,
          stepId,
          fileName: file.name,
          fileType: file.type || "application/octet-stream",
        }),
      });
      const presignJson = await presignRes.json();
      if (!presignRes.ok) {
        setUploading(false);
        setError(presignJson.error || "Failed to prepare upload.");
        return;
      }

      const { uploadUrl, key, fileUrl } = presignJson.data;
      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!putRes.ok) {
        setUploading(false);
        setError(`Failed to upload file: ${file.name}`);
        return;
      }

      const note =
        docLabel.trim().length > 0
          ? picked.length > 1
            ? `${docLabel.trim()} (${i + 1}/${picked.length})`
            : docLabel.trim()
          : "Student supporting document";

      await fetch(`/api/clearance/${data.id}/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stepId,
          fileUrl,
          fileKey: key,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          note,
        }),
      });
    }

    setUploading(false);
    setSuccess(
      picked.length === 1
        ? `Upload successful: ${picked[0].name}`
        : `Upload successful: ${picked.length} files`
    );
    setDocLabel("");
    load();
  }

  async function deleteDocument(documentId: string) {
    if (!data) return;
    setError("");
    setSuccess("");
    setBusyDocumentId(documentId);
    const res = await fetch(`/api/clearance/${data.id}/upload/${documentId}`, {
      method: "DELETE",
    });
    const json = await res.json().catch(() => ({}));
    setBusyDocumentId(null);
    if (!res.ok) {
      setError(json.error || "Failed to delete document.");
      return;
    }
    setSuccess("Document deleted successfully.");
    load();
  }

  async function replaceDocument(stepId: string, documentId: string, file: File) {
    if (!data) return;
    setError("");
    setSuccess("");
    setBusyDocumentId(documentId);

    const presignRes = await fetch("/api/upload/url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        requestId: data.id,
        stepId,
        fileName: file.name,
        fileType: file.type || "application/octet-stream",
      }),
    });
    const presignJson = await presignRes.json().catch(() => ({}));
    if (!presignRes.ok) {
      setBusyDocumentId(null);
      setError(presignJson.error || "Failed to prepare replacement upload.");
      return;
    }

    const { uploadUrl, key, fileUrl } = presignJson.data;
    const putRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!putRes.ok) {
      setBusyDocumentId(null);
      setError(`Failed to upload replacement file: ${file.name}`);
      return;
    }

    const patchRes = await fetch(`/api/clearance/${data.id}/upload/${documentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileUrl,
        fileKey: key,
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
      }),
    });
    const patchJson = await patchRes.json().catch(() => ({}));
    setBusyDocumentId(null);
    if (!patchRes.ok) {
      setError(patchJson.error || "Failed to replace document.");
      return;
    }

    setSuccess(`Document replaced: ${file.name}`);
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4">
        <EmptyState title="No Active Clearance" description="Start your departmental clearance journey." />
        <Button onClick={initiate}>Initiate Clearance</Button>
      </div>
    );
  }

  const rejected = data.steps.find((step) => step.status === "REJECTED");
  const allApproved = data.steps.every((step) => step.status === "APPROVED");
  const currentStep = rejected ?? data.steps.find((step) => step.status === "PENDING");
  const currentOfficeLabel = currentStep
    ? `Step ${currentStep.order + 1}: ${currentStep.department.name}`
    : "Completed";

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold">Student Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Track each department sign-off in sequence.</p>
      </Card>

      <Card>
        <h2 className="mb-4 text-base font-semibold">Progress Tracker</h2>
        <ClearanceStepper steps={data.steps} />
        <p className="mt-3 text-sm text-slate-700">
          Current document location: <span className="font-semibold">{currentOfficeLabel}</span>
        </p>
      </Card>

      <Card>
        <h2 className="text-base font-semibold">Required Documents by Office</h2>
        <div className="mt-3 space-y-3">
          {data.steps.map((step, index) => {
            const docs = REQUIRED_DOCUMENTS[step.department.name] ?? ["Student supporting document(s)"];
            return (
              <div key={step.id} className="rounded-lg border border-slate-200 p-3">
                <p className="text-sm font-semibold text-slate-800">
                  Step {index + 1}: {step.department.name}
                </p>
                <ul className="mt-2 list-disc pl-5 text-sm text-slate-700">
                  {docs.map((doc) => (
                    <li key={doc}>{doc}</li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </Card>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      {currentStep ? (
        <Card>
          <h3 className="text-base font-semibold">Upload Documents for Current Step</h3>
          <p className="mt-2 text-sm text-slate-700">
            Current office: <span className="font-semibold">{currentStep.department.name}</span>
          </p>
          <div className="mt-3">
            <label className="mb-1 block text-sm font-medium text-slate-700">Document Label (optional)</label>
            <input
              value={docLabel}
              onChange={(e) => setDocLabel(e.target.value)}
              placeholder="e.g. Bursary Receipt, WAEC Result"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="mt-3">
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              disabled={uploading}
              onChange={(e) => {
                const files = e.target.files;
                if (files?.length) uploadForStep(currentStep.id, files);
              }}
            />
          </div>
          {uploading ? <p className="mt-2 text-sm text-slate-600">Uploading...</p> : null}
        </Card>
      ) : null}

      <Card>
        <h3 className="text-base font-semibold">Uploaded Documents</h3>
        <div className="mt-3 space-y-3">
          {data.steps.map((step) => (
            <div key={step.id} className="rounded-lg border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-800">{step.department.name}</p>
              {step.documents.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {step.documents.map((doc) => (
                    <li key={doc.id}>
                      <a className="text-blue-700 underline" target="_blank" href={`/api/documents/${doc.id}/view`}>
                        {doc.fileName || doc.fileUrl}
                      </a>
                      {doc.note ? <span className="ml-2 text-slate-600">- {doc.note}</span> : null}
                      <div className="mt-1 flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded bg-red-600 px-2 py-1 text-xs text-white disabled:opacity-60"
                          disabled={busyDocumentId === doc.id}
                          onClick={() => deleteDocument(doc.id)}
                        >
                          {busyDocumentId === doc.id ? "Please wait..." : "Delete"}
                        </button>
                        <label className="cursor-pointer rounded bg-slate-800 px-2 py-1 text-xs text-white">
                          Replace
                          <input
                            type="file"
                            className="hidden"
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) replaceDocument(step.id, doc.id, file);
                            }}
                          />
                        </label>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No documents uploaded for this step yet.</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {allApproved && data.certificateId ? (
        <Card>
          <h3 className="text-base font-semibold">Generate Final Certificate</h3>
          <p className="mt-2 text-sm text-slate-600">
            Your digital clearance is complete. Bring hard copies of the same uploaded documents to the required offices for final physical verification.
          </p>
          <a className="mt-3 inline-block rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" href={`/certificate/${data.certificateId}`}>
            Download Digital Certificate
          </a>
        </Card>
      ) : null}
    </div>
  );
}
