"use client";

import {
  Badge,
  Button,
  ConfirmDialog,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Switch
} from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { KeyRound, Trash2 } from "lucide-react";
import { type FormEvent, useState } from "react";
import { TextMorph } from "torph/react";
import {
  ssoQueryOptions,
  useConfigureSSO,
  useDeleteSSO
} from "./hooks/use-sso";

const PRESET_ICONS: Record<string, string> = {
  Auth0: "A0",
  Google: "G",
  Keycloak: "KC",
  Microsoft: "MS",
  Okta: "OK"
};

const TYPE_OPTIONS = [
  { label: "SAML", value: "saml" },
  { label: "OIDC", value: "oidc" }
];

interface SSOFormState {
  providerName: string;
  type: string;
  clientId: string;
  clientSecret: string;
  issuerUrl: string;
  callbackUrl: string;
  enforced: boolean;
  jitProvisioning: boolean;
  allowedDomains: string;
}

const DEFAULT_FORM: SSOFormState = {
  allowedDomains: "",
  callbackUrl: "",
  clientId: "",
  clientSecret: "",
  enforced: false,
  issuerUrl: "",
  jitProvisioning: false,
  providerName: "",
  type: "oidc"
};

const SSOPage = () => {
  const { data: sso, isLoading, error } = useQuery(ssoQueryOptions());
  const configureMutation = useConfigureSSO();
  const deleteMutation = useDeleteSSO();

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState<SSOFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const openConfigure = (preset?: string) => {
    setForm({
      ...DEFAULT_FORM,
      providerName: preset ?? "",
      type: preset === "Google" || preset === "Microsoft" ? "oidc" : "saml"
    });
    setFormError(null);
    setFormOpen(true);
  };

  const handleClose = () => {
    setForm(DEFAULT_FORM);
    setFormError(null);
    setFormOpen(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!form.providerName.trim()) {
      setFormError("Provider name is required");
      return;
    }

    if (!form.clientId.trim()) {
      setFormError("Client ID is required");
      return;
    }

    if (form.type === "oidc" && !form.issuerUrl.trim()) {
      setFormError("Issuer URL is required for OIDC");
      return;
    }

    try {
      const config: Record<string, unknown> = {
        clientId: form.clientId.trim()
      };

      if (form.clientSecret.trim()) {
        config.clientSecret = form.clientSecret.trim();
      }
      if (form.issuerUrl.trim()) {
        config.issuerUrl = form.issuerUrl.trim();
      }
      if (form.callbackUrl.trim()) {
        config.callbackUrl = form.callbackUrl.trim();
      }

      await configureMutation.mutateAsync({
        allowedDomains: form.allowedDomains
          .split(",")
          .map((d) => d.trim())
          .filter(Boolean),
        enforced: form.enforced,
        jitProvisioning: form.jitProvisioning,
        provider: {
          config,
          name: form.providerName.trim(),
          type: form.type
        }
      });
      handleClose();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleDelete = async () => {
    await deleteMutation.mutateAsync();
    setDeleteOpen(false);
  };

  if (isLoading) {
    return (
      <div>
        <PageHeader
          description="Configure single sign-on for your organization."
          title="SSO Configuration"
        />
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        actions={
          sso?.configured ? undefined : (
            <Button onClick={() => openConfigure()}>
              <KeyRound className="size-4" />
              Configure SSO
            </Button>
          )
        }
        description="Configure single sign-on for your organization."
        title="SSO Configuration"
      />

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {sso?.configured && sso.provider ? (
        <div className="space-y-6">
          <div className="rounded-xl border border-border p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <KeyRound className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium">{sso.provider.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {sso.provider.type.toUpperCase()} Provider
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={sso.provider.enabled ? "success" : "neutral"}>
                  {sso.provider.enabled ? "Active" : "Inactive"}
                </Badge>
                <Badge variant={sso.enforced ? "warning" : "neutral"}>
                  {sso.enforced ? "Enforced" : "Optional"}
                </Badge>
                <Button
                  className="hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                  size="sm"
                  variant="ghost"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">
            Available Providers
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(
              sso?.availablePresets ?? [
                "Google",
                "Microsoft",
                "Okta",
                "Auth0",
                "Keycloak"
              ]
            ).map((preset) => (
              <div
                className="rounded-xl border border-border p-6 transition-colors hover:border-primary/30"
                key={preset}
              >
                <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-muted">
                  <span className="text-sm font-bold text-muted-foreground">
                    {PRESET_ICONS[preset] ?? preset.charAt(0)}
                  </span>
                </div>
                <h3 className="font-medium">{preset}</h3>
                <p className="mb-4 mt-1 text-sm text-muted-foreground">
                  Configure {preset} as your SSO provider
                </p>
                <Button
                  onClick={() => openConfigure(preset)}
                  size="sm"
                  variant="secondary"
                >
                  Configure
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <Modal
        onClose={handleClose}
        open={formOpen}
        size="lg"
        title="Configure SSO"
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {formError}
            </div>
          )}

          <Input
            id="sso-provider-name"
            label="Provider Name"
            onChange={(e) =>
              setForm((f) => ({ ...f, providerName: e.target.value }))
            }
            placeholder="Google"
            value={form.providerName}
          />

          <Select
            id="sso-type"
            label="Type"
            onChange={(value) => setForm((f) => ({ ...f, type: value }))}
            options={TYPE_OPTIONS}
            value={form.type}
          />

          <Input
            id="sso-client-id"
            label="Client ID"
            onChange={(e) =>
              setForm((f) => ({ ...f, clientId: e.target.value }))
            }
            placeholder="your-client-id"
            value={form.clientId}
          />

          {form.type === "oidc" && (
            <Input
              id="sso-client-secret"
              label="Client Secret"
              onChange={(e) =>
                setForm((f) => ({ ...f, clientSecret: e.target.value }))
              }
              placeholder="your-client-secret"
              type="password"
              value={form.clientSecret}
            />
          )}

          <Input
            id="sso-issuer-url"
            label="Issuer URL"
            onChange={(e) =>
              setForm((f) => ({ ...f, issuerUrl: e.target.value }))
            }
            placeholder="https://accounts.google.com"
            type="url"
            value={form.issuerUrl}
          />

          <Input
            id="sso-callback-url"
            label="Callback URL"
            onChange={(e) =>
              setForm((f) => ({ ...f, callbackUrl: e.target.value }))
            }
            placeholder="https://your-app.com/auth/callback"
            type="url"
            value={form.callbackUrl}
          />

          <Input
            description="Comma-separated list of allowed email domains"
            id="sso-allowed-domains"
            label="Allowed Domains"
            onChange={(e) =>
              setForm((f) => ({ ...f, allowedDomains: e.target.value }))
            }
            placeholder="example.com, company.org"
            value={form.allowedDomains}
          />

          <Switch
            checked={form.enforced}
            label="Enforce SSO"
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, enforced: checked }))
            }
          />

          <Switch
            checked={form.jitProvisioning}
            label="JIT Provisioning"
            onCheckedChange={(checked) =>
              setForm((f) => ({ ...f, jitProvisioning: checked }))
            }
          />

          <div className="flex justify-end gap-2 pt-1">
            <Button onClick={handleClose} type="button" variant="secondary">
              Cancel
            </Button>
            <Button disabled={configureMutation.isPending} type="submit">
              <TextMorph>
                {configureMutation.isPending
                  ? "Configuring..."
                  : "Configure SSO"}
              </TextMorph>
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        confirmLabel="Delete"
        description="Are you sure you want to remove SSO configuration? Users will need to sign in with email and password. This action cannot be undone."
        loading={deleteMutation.isPending}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        open={deleteOpen}
        title="Remove SSO Configuration"
      />
    </div>
  );
};

export default SSOPage;
