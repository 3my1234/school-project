import { StepStatus } from "@prisma/client";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";

type StepItem = {
  id: string;
  status: StepStatus;
  comment: string | null;
  department: { name: string };
};

export function ClearanceStepper({ steps }: { steps: StepItem[] }) {
  return (
    <div className="space-y-3">
      {steps.map((step, idx) => {
        const isRejected = step.status === "REJECTED";
        const isApproved = step.status === "APPROVED";

        return (
          <div
            key={step.id}
            className={`rounded-lg border p-4 ${
              isRejected ? "border-red-300 bg-red-50" : isApproved ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white"
            }`}
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">
                Step {idx + 1}: {step.department.name}
              </p>
              <div className="flex items-center gap-1 text-xs font-medium">
                {isApproved && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                {isRejected && <XCircle className="h-4 w-4 text-red-600" />}
                {!isApproved && !isRejected && <Clock3 className="h-4 w-4 text-amber-600" />}
                <span>{step.status}</span>
              </div>
            </div>
            {isRejected && step.comment && <p className="mt-2 text-sm text-red-700">Reason: {step.comment}</p>}
          </div>
        );
      })}
    </div>
  );
}
