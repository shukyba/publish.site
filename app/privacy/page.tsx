import type { Metadata } from "next";
import { SiteHeader } from "../site-header";

export const metadata: Metadata = {
  title: "Privacy Policy | Cliposts Publish",
  description: "Privacy Policy for Cliposts Publish.",
};

export default function PrivacyPage() {
  return (
    <main>
      <SiteHeader />
      <section className="section-shell legal-page">
        <span className="label">Legal</span>
        <h1>Privacy Policy</h1>
        <p className="legal-updated">Last updated: June 22, 2026</p>

        <h2>1. Who We Are</h2>
        <p>
          Cliposts Publish is a product by Cliposts. This Privacy Policy explains what information we collect,
          how we use it, and the choices you have.
        </p>

        <h2>2. Information We Collect</h2>
        <p>We may collect:</p>
        <ul>
          <li>Account information (such as name, email, and user ID).</li>
          <li>Content you submit (such as core ideas, generated posts, and edits).</li>
          <li>Connection metadata for social integrations (for example connection status and platform identifiers).</li>
          <li>Technical data (IP address, browser, device, and usage logs).</li>
        </ul>

        <h2>3. How We Use Information</h2>
        <p>We use information to:</p>
        <ul>
          <li>Provide and improve Cliposts Publish functionality.</li>
          <li>Generate, store, and schedule social content requested by you.</li>
          <li>Operate authentication, security, and fraud prevention controls.</li>
          <li>Respond to support requests and communicate product updates.</li>
        </ul>

        <h2>4. Social Platform Connections</h2>
        <p>
          When you connect a social account, authorization is handled by the relevant platform through
          OAuth. We only use granted access for actions you initiate, such as scheduling posts.
        </p>

        <h2>5. Sharing</h2>
        <p>
          We do not sell personal information. We may share data with service providers that help us
          operate Cliposts Publish (for example hosting, infrastructure, and analytics), subject to contractual
          confidentiality and security obligations.
        </p>

        <h2>6. Data Retention</h2>
        <p>
          We retain data for as long as needed to provide the service, comply with legal obligations,
          resolve disputes, and enforce agreements.
        </p>

        <h2>7. Security</h2>
        <p>
          We use reasonable administrative, technical, and organizational safeguards. No system can be
          guaranteed as fully secure, so you should also protect your own credentials and devices.
        </p>

        <h2>8. Your Rights</h2>
        <p>
          Depending on your location, you may have rights to access, correct, delete, or restrict use
          of personal information. Contact us to request support.
        </p>

        <h2>9. Children</h2>
        <p>Cliposts Publish is not intended for children under 13 and we do not knowingly collect their data.</p>

        <h2>10. Changes</h2>
        <p>
          We may update this Privacy Policy from time to time. We will post the updated version on this
          page with a revised effective date.
        </p>

        <h2>11. Contact</h2>
        <p>
          For privacy questions, contact: <a href="mailto:support@cliposts.com">support@cliposts.com</a>
        </p>
      </section>
    </main>
  );
}
