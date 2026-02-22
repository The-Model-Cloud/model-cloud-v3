"use client";

import { useSubscription } from "@/lib/hooks/useSubscription";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";

export function SubscriptionStatus() {
  const { subscription, tierDetails, loading, error, isManagedClient, tier } =
    useSubscription();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            Error Loading Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </CardContent>
      </Card>
    );
  }

  if (isManagedClient) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Agency Managed Account
          </CardTitle>
          <CardDescription>
            Your subscription is managed by an agency
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You have Premium-tier access provided by your agency. Contact your
            agency administrator for subscription changes.
          </p>
        </CardContent>
      </Card>
    );
  }

  const tierName = tierDetails?.name || "Free";
  const isActive = subscription?.status === "active";
  const cancelAtPeriodEnd = subscription?.cancelAtPeriodEnd;
  const periodEnd = subscription?.currentPeriodEnd;

  const getStatusBadge = () => {
    if (tier === "free") {
      return <Badge variant="secondary">Free</Badge>;
    }
    if (cancelAtPeriodEnd) {
      return <Badge variant="destructive">Cancelling</Badge>;
    }
    if (subscription?.status === "past_due") {
      return <Badge variant="destructive">Past Due</Badge>;
    }
    if (isActive) {
      return <Badge variant="default">Active</Badge>;
    }
    return <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Current Plan</CardTitle>
          {getStatusBadge()}
        </div>
        <CardDescription>{tierName} Plan</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold">
            {tierDetails?.price ? (
              <>
                {tierDetails.currency === "gbp" ? "£" : "$"}
                {(tierDetails.price / 100).toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground">
                  /mo
                </span>
              </>
            ) : (
              <>
                £0
                <span className="text-sm font-normal text-muted-foreground">
                  /forever
                </span>
              </>
            )}
          </span>
        </div>

        {periodEnd && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {cancelAtPeriodEnd ? (
              <span>Cancels on {periodEnd.toLocaleDateString()}</span>
            ) : (
              <span>Renews on {periodEnd.toLocaleDateString()}</span>
            )}
          </div>
        )}

        {cancelAtPeriodEnd && (
          <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Your subscription will be cancelled at the end of the current
              billing period. You will retain access until then.
            </p>
          </div>
        )}

        {subscription?.status === "past_due" && (
          <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
            <p className="text-sm text-red-800 dark:text-red-200">
              Your payment is past due. Please update your payment method to
              avoid losing access.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
