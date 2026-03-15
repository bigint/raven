import Link from "next/link";

const PrivacyPage = () => {
  return (
    <div className="px-4 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: March 14, 2026
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Overview
            </h2>
            <p>
              Raven (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates
              the Raven platform, an AI gateway service. This Privacy Policy
              explains how we collect, use, and protect your information when
              you use our service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Information We Collect
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <strong className="text-foreground">
                  Account information:
                </strong>{" "}
                Name, email address, and password when you create an account.
              </li>
              <li>
                <strong className="text-foreground">Usage data:</strong> API
                request metadata including timestamps, model names, token
                counts, and latency. We do not store the content of your API
                requests or responses.
              </li>
              <li>
                <strong className="text-foreground">
                  Billing information:
                </strong>{" "}
                Payment details are processed by our third-party payment
                processor. We do not store your full credit card number.
              </li>
              <li>
                <strong className="text-foreground">
                  Provider credentials:
                </strong>{" "}
                API keys you provide for AI providers are encrypted at rest and
                used solely to route your requests.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              How We Use Your Information
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>To provide, maintain, and improve the Raven platform.</li>
              <li>
                To display usage analytics, cost tracking, and performance
                metrics in your dashboard.
              </li>
              <li>
                To enforce rate limits, budgets, and access controls you
                configure.
              </li>
              <li>To send transactional emails related to your account.</li>
              <li>To detect and prevent abuse or unauthorized access.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Data Security
            </h2>
            <p>
              We implement industry-standard security measures to protect your
              data. Provider API keys are encrypted at rest using AES-256
              encryption. All data in transit is encrypted using TLS 1.2 or
              higher. We do not log or store the content of your API requests or
              responses passing through the gateway.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Data Retention
            </h2>
            <p>
              We retain your account information for as long as your account is
              active. Usage metadata is retained for 90 days by default. You can
              request deletion of your data at any time by contacting us or
              deleting your account.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Third-Party Services
            </h2>
            <p>
              Raven routes your API requests to third-party AI providers (such
              as OpenAI, Anthropic, and Google) based on your configuration.
              These providers have their own privacy policies that govern how
              they handle data. We encourage you to review them.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Your Rights
            </h2>
            <p>You have the right to:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>Access the personal data we hold about you.</li>
              <li>Request correction of inaccurate data.</li>
              <li>Request deletion of your data and account.</li>
              <li>Export your usage data.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Changes to This Policy
            </h2>
            <p>
              We may update this policy from time to time. We will notify you of
              material changes by email or through a notice on the platform.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Contact
            </h2>
            <p>
              If you have questions about this Privacy Policy, contact us at{" "}
              <Link
                className="text-foreground underline underline-offset-4 hover:opacity-80"
                href="mailto:privacy@raven.dev"
              >
                privacy@raven.dev
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
