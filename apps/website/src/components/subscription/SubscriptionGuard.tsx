"use client";

import { ReactNode } from "react";
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
import { Lock, Sparkles } from "lucide-react";
import type { SubscriptionTier } from "@/types/subscription";

const tierHierarchy: Record<SubscriptionTier, number> = {
  free: 0,
  starter: 1,
  premium: 2,
  agency: 3,
};

interface SubscriptionGuardProps {
  children: ReactNode;
  requiredTier?: SubscriptionTier | SubscriptionTier[];
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export function SubscriptionGuard({
  children,
  requiredTier,
  fallback,
  showUpgradePrompt = true,
}: SubscriptionGuardProps) {
  const { tier, loading } = useSubscription();

  if (loading) {
    return null;
  }

  const currentLevel = tierHierarchy[tier];

  // Check if user meets tier requirements
  let hasAccess = true;
  let minRequiredTier: SubscriptionTier | null = null;

  if (requiredTier) {
    const tiers = Array.isArray(requiredTier) ? requiredTier : [requiredTier];
    const minRequiredLevel = Math.min(...tiers.map((t) => tierHierarchy[t]));
    hasAccess = currentLevel >= minRequiredLevel;

    if (!hasAccess) {
      // Find the minimum tier that would grant access
      const sortedTiers = tiers.sort(
        (a, b) => tierHierarchy[a] - tierHierarchy[b]
      );
      minRequiredTier = sortedTiers[0];
    }
  }

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showUpgradePrompt) {
      return (
        <Card className="border-dashed">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-6 w-6 text-muted-foreground" />
            </div>
            <CardTitle className="text-lg">
              {minRequiredTier
                ? `${minRequiredTier.charAt(0).toUpperCase() + minRequiredTier.slice(1)} Plan Required`
                : "Upgrade Required"}
            </CardTitle>
            <CardDescription>
              This feature requires a higher subscription tier
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/pricing">
                <Sparkles className="mr-2 h-4 w-4" />
                View Plans
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    }

    return null;
  }

  return <>{children}</>;
}
