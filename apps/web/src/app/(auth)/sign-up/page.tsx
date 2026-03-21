import type { Metadata } from "next";
import { Suspense } from "react";
import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = {
  description:
    "Create a free Raven account to start routing and monitoring your AI API calls.",
  title: "Sign Up"
};

const SignUpPage = () => {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  );
};

export default SignUpPage;
