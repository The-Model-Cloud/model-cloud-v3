import { generatePageMetadata } from "@/lib/metadata";
import ContactContent from "./ContactContent";

export async function generateMetadata() {
  return generatePageMetadata("meta-contact");
}

export default function ContactPage() {
  return <ContactContent />;
}
