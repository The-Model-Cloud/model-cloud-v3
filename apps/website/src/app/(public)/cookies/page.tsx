import { Metadata } from "next";
import CookiesContent from "./CookiesContent";

export const metadata: Metadata = {
  title: "Cookies Policy | The Model Cloud",
  description: "Cookies policy for The Model Cloud platform",
};

export default function CookiesPage() {
  return <CookiesContent />;
}
