"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, ArrowRight, Loader2 } from "lucide-react";

function ClientSignUpSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { refresh, tierDetails, loading } = useSubscription();
  const [refreshing, setRefreshing] = useState(true);

  useEffect(() => {
    // Refresh subscription status after successful checkout
    const refreshSubscription = async () => {
      try {
        // Small delay to allow webhook to process
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await refresh();
      } finally {
        setRefreshing(false);
      }
    };

    refreshSubscription();
  }, [refresh]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://v4.themodel.cloud";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
      <Link href="/" className="mb-8">
        <span className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
          The Model Cloud
        </span>
      </Link>
      <div className="w-full max-w-lg">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl">Welcome to The Model Cloud!</CardTitle>
            <CardDescription>
              Your account has been created and your subscription is now active
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {refreshing || loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">
                  Verifying subscription...
                </span>
              </div>
            ) : (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm font-medium">Your Plan</p>
                <p className="text-2xl font-bold">
                  {tierDetails?.name || "Premium"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {tierDetails?.price
                    ? `£${(tierDetails.price / 100).toFixed(2)}/month`
                    : ""}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <Button className="w-full" asChild>
                <Link href={`${appUrl}/onboarding`}>
                  Complete Your Profile
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link href={`${appUrl}/dashboard`}>Go to Dashboard</Link>
              </Button>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              A confirmation email has been sent to your inbox.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ClientSignUpSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background via-accent/30 to-background p-4">
          <div className="w-full max-w-lg">
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <ClientSignUpSuccessContent />
    </Suspense>
  );
}
