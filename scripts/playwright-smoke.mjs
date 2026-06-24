import { chromium } from "playwright";

const CANDIDATE_URLS = ["http://localhost:3001", "http://localhost:3000", "http://localhost:3002"];

async function resolveBaseUrl(page) {
  for (const url of CANDIDATE_URLS) {
    try {
      const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 8000 });
      if (response && response.ok()) return url;
    } catch {
      // Try next candidate.
    }
  }
  throw new Error(`Could not reach publish.site on any of: ${CANDIDATE_URLS.join(", ")}`);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const baseUrl = await resolveBaseUrl(page);
  console.log(`Using base URL: ${baseUrl}`);

  await page.fill("textarea", "We turn a webinar into 14 concise social posts.");
  const generateButton = page.locator("button:has-text('Generate campaign')").first();
  await generateButton.waitFor({ state: "visible", timeout: 10000 });
  await generateButton.click();
  let modalOpened = await page.locator(".modal:has-text('Select platform')").count();
  if (!modalOpened) {
    await page.waitForTimeout(500);
    await generateButton.click();
  }
  await page.waitForSelector(".modal:has-text('Select platform')", { timeout: 15000 });
  await page.click("button:has-text('Continue & generate')");
  await page.waitForURL(`${baseUrl}/campaign`, { timeout: 15000 });

  await page.waitForSelector("button:has-text('Schedule all')");
  await page.click("button:has-text('Schedule all')");
  await page.waitForSelector(".modal:has-text('Connect')");
  await page.click(".modal button:has-text('Connect')");
  await page.waitForSelector(".modal:has-text('Sign in required')");
  await page.click(".modal button:has-text('Sign in')");
  await page.waitForSelector(".modal:has-text('Schedule posts')");
  await page.click(".modal button:has-text('Confirm schedule')");

  await page.waitForURL(`${baseUrl}/campaign/confirmation*`, { timeout: 15000 });
  await page.goto(`${baseUrl}/campaign`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const anyScheduled = await page.locator(".status-scheduled").count();
  console.log(`Scheduled badges found: ${anyScheduled}`);

  if (anyScheduled === 0) {
    throw new Error("Expected scheduled posts after sign-in/connect/schedule flow, but none found.");
  }

  console.log("Playwright smoke flow passed.");
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
