import type { Metadata } from "next";
import { SetupWizard } from "./setup-wizard";

export const metadata: Metadata = {
  description: "Set up your Raven instance by creating an admin account.",
  title: "Setup"
};

const SetupPage = () => {
  return <SetupWizard />;
};

export default SetupPage;
