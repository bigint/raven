import type { Metadata } from "next";
import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = {
  description: "Sign in to your Raven account to manage your AI gateway.",
  title: "Sign In"
};

const SignInPage = () => {
  return <SignInForm />;
};

export default SignInPage;
