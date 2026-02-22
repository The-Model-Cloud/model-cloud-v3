export type BillingPeriod = "monthly" | "yearly";

export interface PricingTier {
  id: string;
  name: string;
  description: string;
  price: number;
  billingPeriod: BillingPeriod;
  features: string[];
  highlighted: boolean;
  order: number;
  published: boolean;
  hide?: boolean;
}
