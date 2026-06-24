"use client";

import { useEffect, useState } from "react";

// Build at runtime to reduce trivial scraping from static source.
function buildContactEmail(): string {
  const user = ["sup", "port"].join("");
  const host = ["cli", "posts"].join("");
  const tld = "com";
  return `${user}\u0040${host}.${tld}`;
}

export function ContactButton() {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  async function handleClick() {
    const email = buildContactEmail();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      const ok = window.prompt("Copy our contact email:", email);
      if (ok !== null) setCopied(true);
    }
  }

  return (
    <button
      type="button"
      className="contact-link"
      onClick={() => void handleClick()}
      aria-label="Copy contact email to clipboard"
    >
      {copied ? "Copied!" : "Contact"}
    </button>
  );
}
