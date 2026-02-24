import { Metadata } from "next";
import FAQContent from "./FAQContent";

export const metadata: Metadata = {
  title: "FAQ | The Model Cloud",
  description: "Frequently asked questions about The Model Cloud platform",
};

export default function FAQPage() {
  return <FAQContent />;
}
