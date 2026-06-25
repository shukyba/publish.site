import Link from "next/link";
import { withMountPath } from "../../../lib/mount-path";
import { SiteHeader } from "../../site-header";

type ConfirmationPageProps = {
  searchParams: Promise<{
    count?: string;
    platform?: string;
    at?: string;
  }>;
};

function toPlatformTitle(platform?: string) {
  if (!platform) return "selected platform";
  if (platform.toLowerCase() === "x") return "X";
  return platform[0].toUpperCase() + platform.slice(1);
}

export default async function CampaignConfirmationPage({ searchParams }: ConfirmationPageProps) {
  const params = await searchParams;
  const count = Number(params.count ?? "0");
  const safeCount = Number.isFinite(count) && count > 0 ? count : 0;
  const platform = toPlatformTitle(params.platform);
  const at = params.at ? new Date(params.at) : null;
  const formattedDate =
    at && !Number.isNaN(at.getTime()) ? at.toLocaleString() : "the selected time";

  return (
    <main>
      <SiteHeader />

      <section className="section-shell panel confirmation-first-panel">
        <div className="panel-header">
          <span className="label">Confirmation</span>
          <h1>Posts scheduled successfully</h1>
          <p>
            {safeCount} {safeCount === 1 ? "post" : "posts"} scheduled for {platform} at{" "}
            {formattedDate}.
          </p>
        </div>
        <ul className="faq-list">
          <li>
            <strong>Scheduled batch:</strong> {safeCount} {safeCount === 1 ? "post" : "posts"}
          </li>
          <li>
            <strong>Platform:</strong> {platform}
          </li>
          <li>
            <strong>Scheduled for:</strong> {formattedDate}
          </li>
        </ul>
        <div className="hero-cta">
          <Link className="button button-primary" href={withMountPath("/scheduled-posts")}>
            View scheduled posts
          </Link>
        </div>
      </section>

      <section className="section-shell panel">
        <div className="panel-header">
          <span className="label">Recommended next step</span>
          <h2>Create your next post plan</h2>
          <p>
            Keep momentum by generating another 14-post sequence for a different idea, audience segment,
            or social platform.
          </p>
        </div>
        <div className="hero-cta">
          <Link className="button button-secondary" href={withMountPath("/#generator")}>
            Generate another post plan
          </Link>
        </div>
      </section>
    </main>
  );
}
