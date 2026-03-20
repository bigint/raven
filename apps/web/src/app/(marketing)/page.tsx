import type { Metadata } from "next";
import { HomePageContent } from "./components/home-page";

export const metadata: Metadata = {
  description:
    "Open-source AI model gateway. Unified API for OpenAI, Anthropic, Google, Mistral, and more.",
  title: "Raven - Open-source AI Model Gateway"
};

const HomePage = () => {
  return <HomePageContent />;
};

export default HomePage;
