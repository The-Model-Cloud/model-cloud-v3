import { Metadata } from "next";
import TermsContent from "./TermsContent";

export const metadata: Metadata = {
  title: "Terms of Service | The Model Cloud",
  description: "Terms of service for The Model Cloud platform",
};

export default function TermsPage() {
  return <TermsContent />;
}
