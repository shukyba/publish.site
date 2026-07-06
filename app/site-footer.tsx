import Link from "next/link";
import { withMountPath } from "../lib/mount-path";
import { ContactButton } from "./contact-button";

export function SiteFooter() {
  return (
    <footer className="footer section-shell">
      <div className="footer-brand">
        <div className="brand">
          <span className="brand-mark">P</span>
          <span>Cliposts Publish</span>
        </div>
        <p className="footer-operator">Operated by Yehoshua Bahar</p>
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
  );
}
