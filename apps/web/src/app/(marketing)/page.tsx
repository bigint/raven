import type { Metadata } from "next";
import { HomePageContent } from "./components/home-page";

export const metadata: Metadata = {
  description:
    "Route, monitor, and manage AI API calls across OpenAI, Anthropic, Google, and more. Virtual keys, real-time analytics, and smart guardrails for teams.",
  title: "Raven - Unified AI Gateway for Teams"
};

const HomePage = () => {
  return <HomePageContent />;
};

export default HomePage;
