"use client";

import Link from "next/link";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface UpgradeButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function UpgradeButton({
  variant = "default",
  size = "default",
  className,
}: UpgradeButtonProps) {
  const { isFreeTier, tier, isManagedClient } = useSubscription();

  // Don't show for agency tier (already on highest tier) or managed clients
  if (tier === "agency" || isManagedClient) {
    return null;
  }

  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href="/pricing">
        <Sparkles className="mr-2 h-4 w-4" />
        {isFreeTier ? "Upgrade Now" : "Upgrade Plan"}
      </Link>
    </Button>
  );
}
