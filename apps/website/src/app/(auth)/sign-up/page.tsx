import { generatePageMetadata } from "@/lib/metadata";
import SignUpContent from "./SignUpContent";

export async function generateMetadata() {
  return generatePageMetadata("meta-signUp");
}

export default function SignUpPage() {
  return <SignUpContent />;
}
