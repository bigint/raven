"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAvailableProviders } from "@/app/(dashboard)/providers/hooks/use-providers";
import { api } from "@/lib/api";
import { useSession } from "@/lib/auth-client";
import { useOrgStore } from "@/stores/org";

interface OrgResponse {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
}

interface KeyResponse {
  id: string;
  key: string;
  name: string;
}

export const useOnboarding = () => {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const { activeOrg, setActiveOrg } = useOrgStore();
  const hasExistingOrg = !!activeOrg;

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Org
  const [orgName, setOrgName] = useState("");

  // Step 2: Provider
  const { data: availableProviders } = useAvailableProviders();
  const [provider, setProvider] = useState("");
  const [providerName, setProviderName] = useState("");
  const [providerApiKey, setProviderApiKey] = useState("");
  const [showProviderKey, setShowProviderKey] = useState(false);

  useEffect(() => {
    if (!provider && availableProviders?.[0]) {
      setProvider(availableProviders[0].slug);
    }
  }, [provider, availableProviders]);

  // Step 3: Key
  const [keyName, setKeyName] = useState("Default");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreateOrg = async () => {
    setError(null);
    if (!orgName.trim()) {
      setError("Organization name is required");
      return;
    }
    try {
      setSubmitting(true);
      const org = await api.post<OrgResponse>("/v1/user/orgs", {
        name: orgName.trim()
      });
      setActiveOrg({
        id: org.id,
        name: org.name,
        plan: org.plan,
        role: org.role,
        slug: org.slug
      });
      setStep(1);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create organization"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddProvider = async () => {
    setError(null);
    if (!providerApiKey.trim()) {
      setError("API key is required");
      return;
    }
    try {
      setSubmitting(true);
      await api.post("/v1/providers", {
        apiKey: providerApiKey.trim(),
        isEnabled: true,
        name: providerName.trim() || undefined,
        provider
      });
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add provider");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateKey = async () => {
    setError(null);
    if (!keyName.trim()) {
      setError("Key name is required");
      return;
    }
    try {
      setSubmitting(true);
      const result = await api.post<KeyResponse>("/v1/keys", {
        environment: "live",
        name: keyName.trim()
      });
      setGeneratedKey(result.key);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (generatedKey) {
      navigator.clipboard.writeText(generatedKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    router.push("/overview");
  };

  const handleSkipProvider = () => {
    setStep(2);
  };

  const navigateToSignIn = () => {
    router.push("/sign-in");
  };

  const navigateToOverview = () => {
    router.push("/overview");
  };

  return {
    availableProviders,
    copied,
    error,
    generatedKey,
    handleAddProvider,
    handleCopy,
    handleCreateKey,

    // Actions
    handleCreateOrg,
    handleFinish,
    handleSkipProvider,
    hasExistingOrg,
    isPending,

    // Step 3: Key
    keyName,
    navigateToOverview,
    navigateToSignIn,

    // Step 1: Org
    orgName,

    // Step 2: Provider
    provider,
    providerApiKey,
    providerName,
    // Session state
    session,
    setKeyName,
    setOrgName,
    setProvider,
    setProviderApiKey,
    setProviderName,
    setShowProviderKey,
    showProviderKey,

    // Step state
    step,
    submitting
  };
};
