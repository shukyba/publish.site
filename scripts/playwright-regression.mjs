import { chromium } from "playwright";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "/publish";
const CANDIDATE_URLS = ["http://localhost:3001", "http://localhost:3000", "http://localhost:3002"];

async function resolveBaseUrl(page) {
  for (const url of CANDIDATE_URLS) {
    try {
      const response = await page.goto(`${url}${BASE_PATH}`, { waitUntil: "domcontentloaded", timeout: 8000 });
      if (response && response.ok()) return `${url}${BASE_PATH}`;
    } catch {
      // Keep trying candidates.
    }
  }
  throw new Error(`Could not reach publish.site on any of: ${CANDIDATE_URLS.join(", ")}${BASE_PATH}`);
}

async function assertVisible(page, selector, description) {
  const node = page.locator(selector).first();
  await node.waitFor({ state: "visible", timeout: 10000 });
  console.log(`OK: ${description}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = await resolveBaseUrl(page);
  console.log(`Using base URL: ${baseUrl}`);

  await assertVisible(page, "nav .nav-links a:has-text('Try it free')", "home nav Try it free");
  await assertVisible(page, "nav .nav-links a:has-text('Pricing')", "home nav Pricing");
  await assertVisible(page, "nav .nav-links a:has-text('FAQ')", "home nav FAQ");
  await assertVisible(page, "nav .nav-links a:has-text('Sign In')", "home nav Sign In");
  await assertVisible(page, "footer .footer-links a:has-text('Try it free')", "footer Try it free link");
  await assertVisible(page, ".pricing-card .button:has-text('Start Starter')", "pricing CTA Starter");
  await assertVisible(page, ".pricing-card .button:has-text('Go Pro')", "pricing CTA Pro");

  await page.fill("textarea", "A founder video can become a 14-day educational social sequence.");
  const generateButton = page.locator("button:has-text('Generate campaign')").first();
  await generateButton.waitFor({ state: "visible", timeout: 10000 });
  await generateButton.click();
  let modalOpened = await page.locator(".modal:has-text('Select platform')").count();
  if (!modalOpened) {
    await page.waitForTimeout(500);
    await generateButton.click();
  }
  await assertVisible(page, ".modal:has-text('Select platform')", "platform modal opens");

  // Verify click-outside closes platform modal.
  await page.click(".modal-backdrop", { position: { x: 8, y: 8 } });
  await page.waitForSelector(".modal:has-text('Select platform')", { state: "hidden", timeout: 5000 });
  console.log("OK: platform modal closes on backdrop click");

  // Re-open and continue generation.
  await page.click("button:has-text('Generate campaign')");
  await assertVisible(page, ".modal:has-text('Select platform')", "platform modal re-opens");
  await page.click(".modal button:has-text('Continue & generate')");
  await page.waitForURL(`${baseUrl}/campaign`, { timeout: 15000 });
  console.log("OK: navigation to campaign page");

  await assertVisible(page, "button:has-text('Schedule selected')", "campaign Schedule selected");
  await assertVisible(page, "button:has-text('Schedule all')", "campaign Schedule all");

  // Trigger connect -> sign-in path and verify outside click closes sign-in modal.
  await page.click("button:has-text('Schedule all')");
  await assertVisible(page, ".modal:has-text('Connect')", "connect modal opens");
  await page.click(".modal button:has-text('Connect')");
  await assertVisible(page, ".modal:has-text('Sign in required')", "sign-in modal opens");
  await page.click(".modal-backdrop", { position: { x: 8, y: 8 } });
  await page.waitForSelector(".modal:has-text('Sign in required')", { state: "hidden", timeout: 5000 });
  console.log("OK: sign-in modal closes on backdrop click");

  // Full schedule flow to verify backend wiring.
  await page.click("button:has-text('Schedule all')");
  await page.click(".modal button:has-text('Connect')");
  await page.click(".modal button:has-text('Sign in')");
  await assertVisible(page, ".modal:has-text('Schedule posts')", "schedule modal opens");
  await page.click(".modal button:has-text('Confirm schedule')");
  await page.waitForURL(`${baseUrl}/campaign/confirmation*`, { timeout: 15000 });
  console.log("OK: redirect to confirmation page");
  await assertVisible(page, "h1:has-text('Posts scheduled successfully')", "confirmation headline");
  await assertVisible(page, "a:has-text('Generate another post plan')", "confirmation generate-again CTA");
  await page.click("a:has-text('Generate another post plan')");
  await page.waitForURL(`${baseUrl}/#generator`, { timeout: 15000 });
  await page.goto(`${baseUrl}/campaign`, { waitUntil: "domcontentloaded" });
  await page.waitForURL(`${baseUrl}/campaign`, { timeout: 15000 });
  await page.waitForTimeout(800);

  const scheduledCount = await page.locator(".status-scheduled").count();
  if (scheduledCount === 0) {
    throw new Error("Expected scheduled posts after connect/sign-in/schedule flow.");
  }
  console.log(`OK: scheduled badges present (${scheduledCount})`);

  // Verify empty-state path.
  await page.evaluate(() => window.localStorage.removeItem("publish_campaign"));
  await page.reload({ waitUntil: "domcontentloaded" });
  await assertVisible(page, ".empty-state", "campaign empty state");
  await assertVisible(page, ".empty-state a:has-text('Go to generator')", "empty-state recovery CTA");

  console.log("Playwright regression flow passed.");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
