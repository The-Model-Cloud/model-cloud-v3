"use client";

import { usePricingTiers } from "@/lib/hooks/usePricingTiers";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionTier } from "@/types/subscription";
import { cmsTierToSubscriptionTier } from "@/types/subscription";

interface TierSelectionStepProps {
  onSelect: (tier: SubscriptionTier, tierName: string, price: number) => void;
  selectedTier: SubscriptionTier | null;
}

export function TierSelectionStep({ onSelect, selectedTier }: TierSelectionStepProps) {
  const { tiers, loading, error } = usePricingTiers();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load pricing tiers. Please refresh the page.</p>
      </div>
    );
  }

  // Filter out hidden tiers and sort by order
  const visibleTiers = tiers
    .filter((tier) => !tier.hide)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Choose Your Plan</h2>
        <p className="text-muted-foreground mt-2">
          Select the plan that best fits your needs
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {visibleTiers.map((tier) => {
          const subscriptionTierId: SubscriptionTier =
            cmsTierToSubscriptionTier[tier.id.toLowerCase()] ||
            (tier.id.toLowerCase() as SubscriptionTier);
          const isSelected = selectedTier === subscriptionTierId;
          const isFree = tier.price === 0;

          return (
            <Card
              key={tier.id}
              className={cn(
                "relative cursor-pointer transition-all hover:shadow-md",
                tier.highlighted && "border-primary shadow-lg border-2",
                isSelected && "ring-2 ring-primary"
              )}
              onClick={() => onSelect(subscriptionTierId, tier.name, tier.price)}
            >
              {tier.highlighted && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-4">
                <h3 className="text-lg font-semibold">{tier.name}</h3>
                <p className="text-sm text-muted-foreground">{tier.description}</p>
                <div className="mt-4">
                  <span className="text-3xl font-bold">
                    {isFree ? "Free" : `£${tier.price}`}
                  </span>
                  {!isFree && (
                    <span className="text-muted-foreground">
                      /{tier.billingPeriod === "monthly" ? "mo" : "yr"}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ul className="space-y-2 mb-4">
                  {tier.features.slice(0, 4).map((feature) => (
                    <li key={feature} className="flex items-start text-sm">
                      <Check className="h-4 w-4 text-primary shrink-0 mr-2 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                  {tier.features.length > 4 && (
                    <li className="text-sm text-muted-foreground">
                      +{tier.features.length - 4} more features
                    </li>
                  )}
                </ul>
                <Button
                  className="w-full"
                  variant={isSelected ? "default" : tier.highlighted ? "default" : "outline"}
                >
                  {isSelected ? "Selected" : "Select Plan"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
