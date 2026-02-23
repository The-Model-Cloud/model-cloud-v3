import { generatePageMetadata } from "@/lib/metadata";
import PricingContent from "./PricingContent";

export async function generateMetadata() {
  return generatePageMetadata("meta-pricing");
}

export default function PricingPage() {
  return <PricingContent />;
}
