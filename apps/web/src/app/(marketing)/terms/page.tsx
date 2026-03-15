import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="px-4 py-16 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-2xl">
        <div className="mb-12">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Last updated: March 14, 2026
          </p>
        </div>

        <div className="space-y-10 text-sm leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Agreement to Terms
            </h2>
            <p>
              By accessing or using the Raven platform (&quot;Service&quot;),
              you agree to be bound by these Terms of Service. If you do not
              agree, do not use the Service.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Description of Service
            </h2>
            <p>
              Raven is an AI gateway that routes, monitors, and manages API
              calls across multiple AI providers. The Service allows you to
              create virtual API keys, set usage controls, and view analytics
              for your AI usage. Raven is currently in beta and features may
              change without notice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Your Account
            </h2>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                You must provide accurate information when creating an account.
              </li>
              <li>
                You are responsible for maintaining the security of your account
                credentials and virtual keys.
              </li>
              <li>
                You are responsible for all activity that occurs under your
                account.
              </li>
              <li>
                You must notify us immediately of any unauthorized use of your
                account.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Acceptable Use
            </h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc space-y-2 pl-5">
              <li>
                Use the Service to violate any applicable law or regulation.
              </li>
              <li>
                Attempt to bypass rate limits, budgets, or access controls.
              </li>
              <li>
                Reverse engineer, decompile, or disassemble any part of the
                Service.
              </li>
              <li>
                Use the Service to transmit malware, spam, or other harmful
                content through API requests.
              </li>
              <li>
                Resell or redistribute access to the Service without our written
                consent.
              </li>
              <li>
                Interfere with or disrupt the integrity or performance of the
                Service.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              API Provider Keys
            </h2>
            <p>
              You are solely responsible for your relationships with third-party
              AI providers. By adding provider API keys to Raven, you confirm
              that you have the right to use those keys and that your usage
              complies with the respective provider&apos;s terms of service.
              Raven is not liable for any charges incurred with third-party
              providers.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Billing and Payment
            </h2>
            <p>
              Paid plans are billed in advance on a monthly or annual basis.
              Charges are non-refundable except as required by law. We reserve
              the right to modify pricing with 30 days&apos; notice. Free tier
              usage is subject to the limits described on our pricing page.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Availability and Beta
            </h2>
            <p>
              Raven is currently in beta. We provide the Service on an &quot;as
              is&quot; and &quot;as available&quot; basis. We do not guarantee
              uninterrupted or error-free operation. We may modify, suspend, or
              discontinue the Service at any time, with or without notice.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Limitation of Liability
            </h2>
            <p>
              To the maximum extent permitted by law, Raven shall not be liable
              for any indirect, incidental, special, consequential, or punitive
              damages, or any loss of profits or revenues, whether incurred
              directly or indirectly, or any loss of data, use, or goodwill. Our
              total liability for any claim arising from the Service shall not
              exceed the amount you paid us in the 12 months preceding the
              claim.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Termination
            </h2>
            <p>
              We may suspend or terminate your account at any time for violation
              of these Terms. You may delete your account at any time through
              your account settings. Upon termination, your right to use the
              Service ceases immediately and we may delete your data after a
              reasonable retention period.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Changes to Terms
            </h2>
            <p>
              We may revise these Terms at any time. Material changes will be
              communicated via email or a notice on the platform. Continued use
              of the Service after changes take effect constitutes acceptance of
              the revised Terms.
            </p>
          </section>

          <section>
            <h2 className="mb-3 text-base font-semibold text-foreground">
              Contact
            </h2>
            <p>
              If you have questions about these Terms, contact us at{" "}
              <Link
                className="text-foreground underline underline-offset-4 hover:opacity-80"
                href="mailto:legal@raven.dev"
              >
                legal@raven.dev
              </Link>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
