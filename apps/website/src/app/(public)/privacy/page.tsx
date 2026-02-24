import { Metadata } from "next";
import PrivacyContent from "./PrivacyContent";

export const metadata: Metadata = {
  title: "Privacy Policy | The Model Cloud",
  description: "Privacy policy for The Model Cloud platform",
};

export default function PrivacyPage() {
  return <PrivacyContent />;
}
