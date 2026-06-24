import type { Metadata } from "next";
import { SiteHeader } from "../site-header";

export const metadata: Metadata = {
  title: "Terms of Service | Cliposts Publish",
  description: "Terms of Service for Cliposts Publish.",
};

export default function TermsPage() {
  return (
    <main>
      <SiteHeader />
      <section className="section-shell legal-page">
        <span className="label">Legal</span>
        <h1>Terms of Service</h1>
        <p className="legal-updated">Last updated: June 22, 2026</p>

        <h2>1. Acceptance</h2>
        <p>
          By using Cliposts Publish, you agree to these Terms of Service. If you do not agree, do not use the
          service.
        </p>

        <h2>2. Service Description</h2>
        <p>
          Cliposts Publish helps users generate, edit, and schedule social content. Some features depend on third
          party services and may change over time.
        </p>

        <h2>3. Accounts</h2>
        <p>
          You are responsible for maintaining account confidentiality and for activities under your
          account. You must provide accurate information and keep it current.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to use Cliposts Publish to:</p>
        <ul>
          <li>Violate laws, regulations, or third party rights.</li>
          <li>Distribute unlawful, abusive, fraudulent, or harmful content.</li>
          <li>Attempt unauthorized access to systems, data, or accounts.</li>
          <li>Interfere with service operation, security, or reliability.</li>
        </ul>

        <h2>5. Third Party Platforms</h2>
        <p>
          Social integrations are subject to each platform&apos;s terms, policies, and technical
          availability. We are not responsible for third party outages, policy actions, or account
          restrictions.
        </p>

        <h2>6. Intellectual Property</h2>
        <p>
          Cliposts Publish and its related software, branding, and materials are owned by Cliposts or its
          licensors. You retain ownership of your submitted content, and grant us rights needed to
          operate the service.
        </p>

        <h2>7. Disclaimers</h2>
        <p>
          Cliposts Publish is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of
          any kind, to the maximum extent allowed by law.
        </p>

        <h2>8. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Cliposts is not liable for indirect, incidental,
          special, consequential, or punitive damages, or any loss of data, revenue, or profits.
        </p>

        <h2>9. Termination</h2>
        <p>
          We may suspend or terminate access if these Terms are violated or if required for security,
          legal, or operational reasons.
        </p>

        <h2>10. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. Continued use after updates means you accept the
          revised Terms.
        </p>

        <h2>11. Contact</h2>
        <p>
          For questions about these Terms, contact: <a href="mailto:support@cliposts.com">support@cliposts.com</a>
        </p>
      </section>
    </main>
  );
}
