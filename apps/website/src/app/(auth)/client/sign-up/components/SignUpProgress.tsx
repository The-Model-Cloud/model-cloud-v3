"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface SignUpProgressProps {
  currentStep: "tier" | "details" | "processing";
  showPaymentStep: boolean;
}

export function SignUpProgress({ currentStep, showPaymentStep }: SignUpProgressProps) {
  const steps = [
    { id: "tier", label: "Choose Plan" },
    { id: "details", label: "Account Details" },
    ...(showPaymentStep ? [{ id: "processing", label: "Payment" }] : []),
  ];

  const getStepStatus = (stepId: string) => {
    const stepOrder = steps.findIndex((s) => s.id === stepId);
    const currentOrder = steps.findIndex((s) => s.id === currentStep);

    if (stepOrder < currentOrder) return "completed";
    if (stepOrder === currentOrder) return "current";
    return "upcoming";
  };

  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center justify-center space-x-4">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          return (
            <li key={step.id} className="flex items-center">
              {index > 0 && (
                <div
                  className={cn(
                    "h-0.5 w-8 sm:w-12 mx-2",
                    status === "upcoming" ? "bg-muted" : "bg-primary"
                  )}
                />
              )}
              <div className="flex items-center">
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    status === "completed" && "bg-primary text-primary-foreground",
                    status === "current" && "border-2 border-primary text-primary",
                    status === "upcoming" && "border-2 border-muted text-muted-foreground"
                  )}
                >
                  {status === "completed" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    "ml-2 text-sm font-medium hidden sm:block",
                    status === "current" && "text-primary",
                    status === "upcoming" && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
