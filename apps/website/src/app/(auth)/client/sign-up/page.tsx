import { Metadata } from "next";
import ClientSignUpContent from "./ClientSignUpContent";

export const metadata: Metadata = {
  title: "Client Sign Up | The Model Cloud",
  description: "Create your client account and choose your subscription tier",
};

export default function ClientSignUpPage() {
  return <ClientSignUpContent />;
}
