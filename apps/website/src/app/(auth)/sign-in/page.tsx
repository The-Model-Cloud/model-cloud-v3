import { generatePageMetadata } from "@/lib/metadata";
import SignInContent from "./SignInContent";

export async function generateMetadata() {
  return generatePageMetadata("meta-signIn");
}

export default function SignInPage() {
  return <SignInContent />;
}
