"use client";

import { useSubscriptionContext } from "@/contexts/SubscriptionContext";

export function useSubscription() {
  return useSubscriptionContext();
}
