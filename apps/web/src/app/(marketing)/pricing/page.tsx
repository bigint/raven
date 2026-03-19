import type { Metadata } from "next";
import { PricingPageContent } from "../components/pricing-page";

export const metadata: Metadata = {
  description:
    "Simple, transparent pricing for Raven. Start free and scale as you grow with Pro, Team, and Enterprise plans.",
  title: "Pricing - Raven"
};

const PricingPage = () => {
  return <PricingPageContent />;
};

export default PricingPage;
