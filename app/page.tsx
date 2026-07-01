import type { Metadata } from "next";
import Link from "next/link";
import { GeneratorClient } from "./generator-client";
import { withMountPath } from "../lib/mount-path";
import { HomeNav } from "./home-nav";
import { ContactButton } from "./contact-button";
import { PublishPricing } from "./publish-pricing";

export const dynamic = "force-dynamic";

const faqs = [
  {
    question: "How does Publish differ from Cliposts?",
    answer:
      "Cliposts helps produce social content from recordings. Publish turns one approved idea into a 14-day follow-up campaign and handles connection + scheduling flow.",
  },
  {
    question: "Can I use Publish as a guest?",
    answer:
      "Yes. Guests can generate and edit campaigns. Connecting social accounts and scheduling are gated behind sign-in.",
  },
  {
    question: "Are social posting APIs live?",
    answer:
      "Not yet. This MVP uses realistic mocked responses for OAuth, scheduling, and publishing statuses so we can validate UX first.",
  },
];

export const metadata: Metadata = {
  title: "Publish | Social Campaigns by Cliposts",
  description:
    "Turn one core idea into a 14-day social campaign. Draft, edit, connect accounts, and schedule from one Publish workflow.",
};

export default function Home() {
  return (
    <main>
      <HomeNav />

      <section className="hero section-shell">
        <span className="label">Publish by Cliposts</span>
        <h1>Turn one core idea into 14 days of social follow-up.</h1>
        <p className="hero-copy">
          Generate, refine, and schedule campaign posts for LinkedIn, X, or Facebook from one clean
          workflow.
        </p>
        <div className="hero-cta">
          <a className="button button-primary" href="#generator">
            Try it free
          </a>
          <a className="button button-secondary" href="#pricing">
            See pricing
          </a>
        </div>
      </section>

      <GeneratorClient />

      <PublishPricing />

      <section className="faq section-shell" id="faq">
        <div className="section-heading">
          <span className="label">FAQ</span>
          <h2>Simple by design</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <footer className="footer section-shell">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span>Cliposts Publish</span>
        </div>
        <div className="footer-links">
          <a href="#generator">Try it free</a>
          <a href="#pricing">Pricing</a>
          <a href="#faq">FAQ</a>
          <Link href={withMountPath("/privacy")}>Privacy</Link>
          <Link href={withMountPath("/terms")}>Terms</Link>
          <ContactButton />
        </div>
      </footer>
    </main>
  );
}
