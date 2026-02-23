import { generatePageMetadata } from "@/lib/metadata";
import AboutUsContent from "./AboutUsContent";

export async function generateMetadata() {
  return generatePageMetadata("meta-about");
}

export default function AboutUsPage() {
  return <AboutUsContent />;
}
