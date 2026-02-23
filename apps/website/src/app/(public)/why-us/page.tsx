import { generatePageMetadata } from "@/lib/metadata";
import WhyUsContent from "./WhyUsContent";

export async function generateMetadata() {
  return generatePageMetadata("meta-whyUs");
}

export default function WhyUsPage() {
  return <WhyUsContent />;
}
