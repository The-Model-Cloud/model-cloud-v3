"use client";

import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { useCheckout } from "@/lib/hooks/useCheckout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { PricingTier } from "@/types/pricing";
import type { SubscriptionTier } from "@/types/subscription";
import { cmsTierToSubscriptionTier } from "@/types/subscription";

// Get inherited features from lower-order tiers
function getInheritedFeatures(tier: PricingTier, allTiers: PricingTier[]): string[] {
  const lowerTiers = allTiers.filter((t) => (t.order || 0) < (tier.order || 0));
  const inheritedSet = new Set<string>();
  lowerTiers.forEach((t) => {
    t.features.forEach((f) => inheritedSet.add(f));
  });
  // Remove features that are already in this tier's own features
  tier.features.forEach((f) => inheritedSet.delete(f));
  return Array.from(inheritedSet);
}

interface PricingCardProps {
  tier: PricingTier;
  allTiers?: PricingTier[];
}

export function PricingCard({ tier, allTiers = [] }: PricingCardProps) {
  const { firebaseUser, loading: authLoading } = useAuth();
  const { tier: currentTier, loading: subLoading, isFreeTier } = useSubscription();
  const { startCheckout, openPortal, loading: checkoutLoading } = useCheckout();
  const [localLoading, setLocalLoading] = useState(false);

  const isLoading = authLoading || subLoading || checkoutLoading || localLoading;

  // Map CMS tier ID to subscription tier ID
  const subscriptionTierId: SubscriptionTier =
    cmsTierToSubscriptionTier[tier.id.toLowerCase()] ||
    (tier.id.toLowerCase() as SubscriptionTier);

  const isCurrentTier = currentTier === subscriptionTierId;
  const hasSubscription = !isFreeTier;

  const handleClick = async () => {
    if (!firebaseUser) {
      // Not authenticated - let the Link handle navigation
      return;
    }

    setLocalLoading(true);
    try {
      if (hasSubscription) {
        // Has subscription - open portal to manage/upgrade
        await openPortal();
      } else {
        // No subscription (free tier) - start checkout
        await startCheckout(subscriptionTierId);
      }
    } catch (error) {
      console.error("Checkout error:", error);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLocalLoading(false);
    }
  };

  const getButtonText = () => {
    if (isLoading) return "Loading...";
    if (!firebaseUser) return "Get Started";
    if (isCurrentTier) return "Current Plan";
    if (hasSubscription) return "Manage Plan";
    return "Subscribe";
  };

  const isButtonDisabled = isLoading || isCurrentTier;

  return (
    <Card
      className={cn(
        "relative flex flex-col h-full",
        tier.highlighted && "border-primary shadow-lg border-2",
        isCurrentTier && "ring-2 ring-primary"
      )}
    >
      {tier.highlighted && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          Most Popular
        </Badge>
      )}
      {isCurrentTier && firebaseUser && (
        <Badge variant="secondary" className="absolute -top-3 right-4">
          Current
        </Badge>
      )}
      <CardHeader className="text-center pb-4">
        <h3 className="text-xl font-semibold">{tier.name}</h3>
        <p className="text-sm text-muted-foreground">{tier.description}</p>
        <div className="mt-4">
          <span className="text-4xl font-bold">£{tier.price}</span>
          <span className="text-muted-foreground">
            /{tier.billingPeriod === "monthly" ? "mo" : "yr"}
          </span>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-3">
          {/* Show inherited features first (from lower tiers) */}
          {getInheritedFeatures(tier, allTiers).map((feature) => (
            <li key={feature} className="flex items-start text-muted-foreground">
              <Check className="h-5 w-5 text-muted-foreground/60 shrink-0 mr-3" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
          {/* Show this tier's own features */}
          {tier.features.map((feature) => (
            <li key={feature} className="flex items-start">
              <Check className="h-5 w-5 text-primary shrink-0 mr-3" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {!firebaseUser ? (
          <Button
            className="w-full"
            variant={tier.highlighted ? "default" : "outline"}
            asChild
          >
            <a href={`/client/sign-up?tier=${subscriptionTierId}`}>Get Started</a>
          </Button>
        ) : (
          <Button
            className="w-full"
            variant={tier.highlighted ? "default" : "outline"}
            onClick={handleClick}
            disabled={isButtonDisabled}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {getButtonText()}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
