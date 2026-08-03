import type { Metadata } from "next";
import HomeClient from "./HomeClient";
import { getAccuracyBaseline } from "@/lib/accuracyBaseline";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function Page() {
  const accuracy = getAccuracyBaseline();
  return <HomeClient accuracy={accuracy} />;
}
