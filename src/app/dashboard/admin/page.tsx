"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";

type PendingStep = {
  id: string;
  requestId: string;
  documents: Array<{ id: string; fileUrl: string; fileKey: string | null; fileName: string | null; note: string | null }>;
  request: {
    student: { id: string; name: string; email: string };
    documents: Array<{
      id: string;
      fileUrl: string;
      fileKey: string | null;
      fileName: string | null;
      note: string | null;
      step: { department: { name: string } } | null;
    }>;
  };
  department: { name: string };
};

type DepartmentOption = { id: string; name: string };
type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: "STUDENT" | "FACULTY_ADMIN" | "SUPER_ADMIN";
  department: { id: string; name: string } | null;
  createdAt: string;
};

export default function AdminDashboardPage() {
  const [rows, setRows] = useState<PendingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PendingStep | null>(null);
  const [comment, setComment] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createError, setCreateError] = useState("");
  const [createdCreds, setCreatedCreds] = useState<{ email: string; password: string } | null>(null);
  const [resetPasswordInput, setResetPasswordInput] = useState<Record<string, string>>({});
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState("");
  const [resetError, setResetError] = useState("");
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "STUDENT" as "STUDENT" | "FACULTY_ADMIN" | "SUPER_ADMIN",
    departmentId: "",
    password: "",
  });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/pending", { cache: "no-store" });
    const json = await res.json();
    setRows(json.data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    loadSuperAdminContext();
  }, []);

  useEffect(() => {
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setModal(null);
    }
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, []);

  async function loadSuperAdminContext() {
    const res = await fetch("/api/super-admin/users", { cache: "no-store" });
    if (!res.ok) {
      setCanManageUsers(false);
      return;
    }
    const json = await res.json();
    setCanManageUsers(true);
    setDepartments(json?.data?.departments ?? []);
    setManagedUsers(json?.data?.users ?? []);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreatedCreds(null);

    if (!newUser.name.trim() || !newUser.email.trim()) {
      setCreateError("Name and email are required.");
      return;
    }
    if (newUser.role === "FACULTY_ADMIN" && !newUser.departmentId) {
      setCreateError("Select a department for departmental admin.");
      return;
    }

    setCreatingUser(true);
    const res = await fetch("/api/super-admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newUser.name.trim(),
        email: newUser.email.trim(),
        role: newUser.role,
        departmentId: newUser.role === "FACULTY_ADMIN" ? newUser.departmentId : null,
        password: newUser.password.trim() || undefined,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setCreatingUser(false);

    if (!res.ok) {
      setCreateError(json.error || "Failed to create user.");
      return;
    }

    setCreatedCreds({
      email: json.data.user.email,
      password: json.data.temporaryPassword,
    });
    setNewUser({
      name: "",
      email: "",
      role: "STUDENT",
      departmentId: "",
      password: "",
    });
    loadSuperAdminContext();
  }

  async function resetUserPassword(userId: string) {
    setResetError("");
    setResetMessage("");
    setResettingUserId(userId);

    const customPassword = (resetPasswordInput[userId] || "").trim();
    const res = await fetch(`/api/super-admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: customPassword || undefined }),
    });
    const json = await res.json().catch(() => ({}));
    setResettingUserId(null);

    if (!res.ok) {
      setResetError(json.error || "Failed to reset password.");
      return;
    }

    setResetPasswordInput((prev) => ({ ...prev, [userId]: "" }));
    setResetMessage(`Password reset for ${json.data.user.email}. New password: ${json.data.temporaryPassword}`);
  }

  async function act(step: PendingStep, action: "APPROVE" | "REJECT") {
    if (action === "REJECT" && !comment.trim()) {
      setActionError("Rejection comment is required.");
      return;
    }

    setActionLoading(true);
    setActionError("");
    const res = await fetch(`/api/clearance/${step.requestId}/step/${step.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, comment }),
    });
    const json = await res.json().catch(() => ({}));
    setActionLoading(false);
    if (!res.ok) {
      setActionError(json.error || "Failed to process this action.");
      return;
    }
    setModal(null);
    setComment("");
    setActionError("");
    load();
  }

  if (loading) return <div className="flex justify-center py-12"><Spinner className="h-7 w-7" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="text-xl font-semibold">Admin Approval Queue</h1>
        <p className="mt-1 text-sm text-slate-600">Pending students in your department.</p>
      </Card>

      {canManageUsers ? (
        <>
        <Card>
          <h2 className="text-lg font-semibold">Super Admin: Create User</h2>
          <p className="mt-1 text-sm text-slate-600">Create student and office accounts with login credentials.</p>
          <form onSubmit={createUser} className="mt-4 grid gap-3">
            <Input
              placeholder="Full name"
              value={newUser.name}
              onChange={(e) => setNewUser((prev) => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              type="email"
              placeholder="Email"
              value={newUser.email}
              onChange={(e) => setNewUser((prev) => ({ ...prev, email: e.target.value }))}
              required
            />
            <select
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              value={newUser.role}
              onChange={(e) =>
                setNewUser((prev) => ({
                  ...prev,
                  role: e.target.value as "STUDENT" | "FACULTY_ADMIN" | "SUPER_ADMIN",
                  departmentId: "",
                }))
              }
            >
              <option value="STUDENT">Student</option>
              <option value="FACULTY_ADMIN">Department Admin (Library/Bursary/etc)</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            {newUser.role === "FACULTY_ADMIN" ? (
              <select
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={newUser.departmentId}
                onChange={(e) => setNewUser((prev) => ({ ...prev, departmentId: e.target.value }))}
                required
              >
                <option value="">Select department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Input
              type="text"
              placeholder="Optional password (leave empty to auto-generate)"
              value={newUser.password}
              onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
            />
            {createError ? <p className="text-sm text-red-700">{createError}</p> : null}
            {createdCreds ? (
              <p className="text-sm text-emerald-700">
                Account created. Email: <span className="font-semibold">{createdCreds.email}</span> | Password:{" "}
                <span className="font-semibold">{createdCreds.password}</span>
              </p>
            ) : null}
            <Button type="submit" isLoading={creatingUser} className="w-fit">
              Create User
            </Button>
          </form>
        </Card>
        <Card className="overflow-x-auto">
          <h2 className="text-lg font-semibold">Super Admin: Reset User Password</h2>
          <p className="mt-1 text-sm text-slate-600">Reset any user password and share the new credential securely.</p>
          {resetError ? <p className="mt-2 text-sm text-red-700">{resetError}</p> : null}
          {resetMessage ? <p className="mt-2 text-sm text-emerald-700">{resetMessage}</p> : null}
          <table className="mt-3 w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Name</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Department</th>
                <th className="py-2">Password Reset</th>
              </tr>
            </thead>
            <tbody>
              {managedUsers.map((u) => (
                <tr key={u.id} className="border-b align-top">
                  <td className="py-2">{u.name}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2">{u.department?.name || "-"}</td>
                  <td className="py-2">
                    <div className="flex min-w-[320px] items-center gap-2">
                      <Input
                        type="text"
                        placeholder="Optional custom password"
                        value={resetPasswordInput[u.id] || ""}
                        onChange={(e) =>
                          setResetPasswordInput((prev) => ({ ...prev, [u.id]: e.target.value }))
                        }
                      />
                      <Button
                        type="button"
                        isLoading={resettingUserId === u.id}
                        onClick={() => resetUserPassword(u.id)}
                      >
                        Reset
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </>
      ) : null}

      {!rows.length ? (
        <EmptyState title="No Pending Students" description="Your departmental queue is currently clear." />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b">
                <th className="py-2">Student</th>
                <th className="py-2">Email</th>
                <th className="py-2">Department</th>
                <th className="py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b">
                  <td className="py-2">{row.request.student.name}</td>
                  <td className="py-2">{row.request.student.email}</td>
                  <td className="py-2">{row.department.name}</td>
                  <td className="py-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setModal(row);
                        setComment("");
                        setActionError("");
                      }}
                    >
                      View Details
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {modal ? (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-8"
          onClick={() => setModal(null)}
        >
          <Card
            className="max-h-[85vh] w-full max-w-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Student Details</h3>
            <p className="mt-1 text-sm">{modal.request.student.name} ({modal.request.student.email})</p>
            <div className="mt-3">
              <p className="text-sm font-medium">Documents For This Office</p>
              {modal.documents.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {modal.documents.map((doc) => (
                    <li key={doc.id}>
                      <a className="text-blue-700 underline" target="_blank" href={`/api/documents/${doc.id}/view`}>
                        {doc.fileName || doc.fileUrl}
                      </a>
                      {doc.note ? <span className="ml-2 text-slate-600">- {doc.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No documents uploaded.</p>
              )}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium">All Student Documents (All Departments)</p>
              {modal.request.documents.length ? (
                <ul className="mt-2 space-y-1 text-sm">
                  {modal.request.documents.map((doc) => (
                    <li key={doc.id}>
                      <a className="text-blue-700 underline" target="_blank" href={`/api/documents/${doc.id}/view`}>
                        {doc.fileName || doc.fileUrl}
                      </a>
                      <span className="ml-2 text-slate-600">
                        ({doc.step?.department.name || "General"})
                      </span>
                      {doc.note ? <span className="ml-2 text-slate-600">- {doc.note}</span> : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-1 text-sm text-slate-500">No student documents found.</p>
              )}
            </div>
            <div className="mt-4">
              <Input placeholder="Rejection comment (required for reject)" value={comment} onChange={(e) => setComment(e.target.value)} />
            </div>
            {actionError ? <p className="mt-2 text-sm text-red-700">{actionError}</p> : null}
            <div className="mt-4 flex gap-2">
              <Button type="button" isLoading={actionLoading} onClick={() => act(modal, "APPROVE")}>Approve</Button>
              <Button type="button" variant="danger" isLoading={actionLoading} onClick={() => act(modal, "REJECT")}>Reject</Button>
              <Button type="button" variant="ghost" onClick={() => setModal(null)}>Close</Button>
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
