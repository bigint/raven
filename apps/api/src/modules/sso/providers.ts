// SSO provider configurations
export interface SSOProvider {
  id: string;
  name: string;
  type: "saml" | "oidc";
  enabled: boolean;
  config: SAMLConfig | OIDCConfig;
}

export interface SAMLConfig {
  entryPoint: string; // IdP SSO URL
  issuer: string; // SP entity ID
  certificate: string; // IdP signing certificate (PEM)
  callbackUrl: string; // ACS URL
  signatureAlgorithm: "sha256" | "sha512";
  nameIdFormat: string;
  attributeMapping: {
    email: string;
    name?: string;
    groups?: string;
  };
}

export interface OIDCConfig {
  clientId: string;
  clientSecret: string;
  issuerUrl: string; // e.g., https://accounts.google.com
  authorizationUrl?: string; // Override from discovery
  tokenUrl?: string; // Override from discovery
  userInfoUrl?: string; // Override from discovery
  scopes: string[]; // e.g., ["openid", "profile", "email"]
  callbackUrl: string;
  attributeMapping: {
    email: string;
    name?: string;
    sub?: string;
  };
}

// Well-known OIDC provider presets
export const OIDC_PRESETS: Record<string, Partial<OIDCConfig>> = {
  auth0: {
    attributeMapping: { email: "email", name: "name", sub: "sub" },
    scopes: ["openid", "profile", "email"]
  },
  google: {
    attributeMapping: { email: "email", name: "name", sub: "sub" },
    issuerUrl: "https://accounts.google.com",
    scopes: ["openid", "profile", "email"]
  },
  keycloak: {
    attributeMapping: { email: "email", name: "name", sub: "sub" },
    scopes: ["openid", "profile", "email"]
  },
  microsoft: {
    attributeMapping: { email: "email", name: "name", sub: "sub" },
    issuerUrl: "https://login.microsoftonline.com/common/v2.0",
    scopes: ["openid", "profile", "email"]
  },
  okta: {
    attributeMapping: { email: "email", name: "name", sub: "sub" },
    scopes: ["openid", "profile", "email"]
  }
};

// SSO connection state per organization
export interface SSOConnection {
  organizationId: string;
  provider: SSOProvider;
  enforced: boolean; // If true, all users must use SSO
  jitProvisioning: boolean; // Auto-create users on first SSO login
  defaultRole: string; // Role for JIT-provisioned users
  allowedDomains: string[]; // Only allow emails from these domains
}
