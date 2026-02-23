"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUpClient } from "@/lib/firebase/auth";
import { initializeFreeTier, createSubscriptionCheckoutSession } from "@/lib/firebase/functions";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { SignUpProgress } from "./components/SignUpProgress";
import { TierSelectionStep } from "./components/TierSelectionStep";
import { AccountDetailsStep, type ClientSignUpFormData } from "./components/AccountDetailsStep";
import type { SubscriptionTier } from "@/types/subscription";

function ClientSignUpForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"tier" | "details" | "processing">("tier");
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier | null>(null);
  const [tierName, setTierName] = useState<string>("");
  const [tierPrice, setTierPrice] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasCancelled, setWasCancelled] = useState(false);

  // Handle URL parameters for tier pre-selection and cancelled payment
  useEffect(() => {
    const tierParam = searchParams.get("tier");
    const cancelledParam = searchParams.get("cancelled");

    if (cancelledParam === "true") {
      setWasCancelled(true);
      setError("Payment was cancelled. You can try again or choose a different plan.");
    }

    if (tierParam && ["free", "starter", "premium", "agency"].includes(tierParam)) {
      setSelectedTier(tierParam as SubscriptionTier);
      // We'll set the name/price when the tiers load in TierSelectionStep
    }
  }, [searchParams]);

  const handleTierSelect = (tier: SubscriptionTier, name: string, price: number) => {
    setSelectedTier(tier);
    setTierName(name);
    setTierPrice(price);
    setError(null);
    setWasCancelled(false);
    setStep("details");
  };

  const handleBack = () => {
    setStep("tier");
    setError(null);
  };

  const handleFreeTierSubmit = async (formData: ClientSignUpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      // Create the account
      await signUpClient(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.companyName,
        "free"
      );

      // Brief delay for auth state to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Initialize free tier
      await initializeFreeTier();

      toast.success("Account created successfully!");

      // Redirect to platform onboarding
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v4.themodel.cloud";
      window.location.href = `${appUrl}/onboarding`;
    } catch (err: unknown) {
      console.error("Sign up error:", err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError("Failed to create account. Please try again.");
      }
      setIsLoading(false);
    }
  };

  const handlePaidTierSubmit = async (formData: ClientSignUpFormData) => {
    if (!selectedTier) return;

    setIsLoading(true);
    setError(null);
    setStep("processing");

    try {
      // Create the account
      await signUpClient(
        formData.email,
        formData.password,
        formData.firstName,
        formData.lastName,
        formData.companyName,
        selectedTier
      );

      // Brief delay for auth state to propagate
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Start Stripe checkout
      const baseUrl = window.location.origin;
      const response = await createSubscriptionCheckoutSession(
        selectedTier,
        `${baseUrl}/client/sign-up/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/client/sign-up?tier=${selectedTier}&cancelled=true`
      );

      // Redirect to Stripe
      window.location.href = response.url;
    } catch (err: unknown) {
      console.error("Sign up error:", err);
      const firebaseError = err as { code?: string };
      if (firebaseError.code === "auth/email-already-in-use") {
        setError("This email is already registered. Please sign in instead.");
      } else {
        setError("Failed to create account. Please try again.");
      }
      setStep("details");
      setIsLoading(false);
    }
  };

  const handleSubmit = async (formData: ClientSignUpFormData) => {
    if (tierPrice === 0) {
      await handleFreeTierSubmit(formData);
    } else {
      await handlePaidTierSubmit(formData);
    }
  };

  const handleRetryPayment = async () => {
    if (!selectedTier) return;

    setIsLoading(true);
    setError(null);
    setStep("processing");

    try {
      const baseUrl = window.location.origin;
      const response = await createSubscriptionCheckoutSession(
        selectedTier,
        `${baseUrl}/client/sign-up/success?session_id={CHECKOUT_SESSION_ID}`,
        `${baseUrl}/client/sign-up?tier=${selectedTier}&cancelled=true`
      );

      window.location.href = response.url;
    } catch (err) {
      console.error("Retry payment error:", err);
      setError("Failed to start payment. Please try again.");
      setStep("details");
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SignUpProgress
        currentStep={step}
        showPaymentStep={tierPrice > 0}
      />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            {wasCancelled && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryPayment}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry Payment
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {step === "tier" && (
        <TierSelectionStep
          onSelect={handleTierSelect}
          selectedTier={selectedTier}
        />
      )}

      {step === "details" && selectedTier && (
        <AccountDetailsStep
          selectedTier={selectedTier}
          tierName={tierName}
          tierPrice={tierPrice}
          onSubmit={handleSubmit}
          onBack={handleBack}
          isLoading={isLoading}
        />
      )}

      {step === "processing" && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Setting up your account...</p>
            <p className="text-sm text-muted-foreground">
              You&apos;ll be redirected to complete payment shortly.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-primary hover:underline">
          Sign in
        </Link>
      </div>

      <p className="text-xs text-center text-muted-foreground">
        By creating an account, you agree to our{" "}
        <Link href="/terms" className="underline hover:text-primary">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline hover:text-primary">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}

export default function ClientSignUpContent() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <ClientSignUpForm />
    </Suspense>
  );
}
