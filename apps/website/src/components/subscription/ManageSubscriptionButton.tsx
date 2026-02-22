"use client";

import { useCheckout } from "@/lib/hooks/useCheckout";
import { useSubscription } from "@/lib/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface ManageSubscriptionButtonProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function ManageSubscriptionButton({
  variant = "default",
  size = "default",
  className,
}: ManageSubscriptionButtonProps) {
  const { isFreeTier, isManagedClient } = useSubscription();
  const { openPortal, loading } = useCheckout();

  const handleClick = async () => {
    try {
      await openPortal();
    } catch {
      toast.error("Failed to open billing portal. Please try again.");
    }
  };

  // Don't show for free tier users or managed clients
  if (isFreeTier || isManagedClient) {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <ExternalLink className="mr-2 h-4 w-4" />
      )}
      Manage Billing
    </Button>
  );
}
