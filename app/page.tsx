import type { Metadata } from "next";
import Link from "next/link";
import { GeneratorClient } from "./generator-client";
import { SIGN_UP_URL } from "../lib/api";
import { withMountPath } from "../lib/mount-path";
import { HomeNav } from "./home-nav";
import { ContactButton } from "./contact-button";

const plans = [
  {
    name: "Guest",
    price: "$0",
    description: "Generate and edit campaigns without signup.",
    features: ["Generate 14-post campaigns", "Edit and regenerate posts", "Preview scheduling flow"],
    ctaNote: "No signup required",
  },
  {
    name: "Starter",
    price: "$19",
    description: "For creators ready to connect and schedule.",
    features: ["Connect one social account", "Schedule selected posts", "Campaign history (coming soon)"],
    cta: "Start Starter",
  },
  {
    name: "Pro",
    price: "$49",
    description: "For teams running multiple campaign tracks.",
    features: ["Connect multiple platforms", "Schedule all in one click", "Priority support"],
    cta: "Go Pro",
    featured: true,
  },
];

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

      <section className="pricing section-shell" id="pricing">
        <div className="section-heading">
          <span className="label">Pricing</span>
          <h2>Move from idea to scheduled campaign faster.</h2>
          <p>Keep the workflow lightweight now, plug in real social APIs later.</p>
        </div>
        <div className="pricing-grid">
          {plans.map((plan) => (
            <article className={`pricing-card ${plan.featured ? "pricing-card-featured" : ""}`} key={plan.name}>
              <p className="plan-audience">{plan.name}</p>
              <h3>{plan.price}</h3>
              <p className="plan-description">{plan.description}</p>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {plan.cta ? (
                <a className="button button-primary button-plan" href={SIGN_UP_URL}>
                  {plan.cta}
                </a>
              ) : (
                <span className="plan-cta-note">{plan.ctaNote}</span>
              )}
            </article>
          ))}
        </div>
      </section>

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
