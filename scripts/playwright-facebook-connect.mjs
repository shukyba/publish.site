/**
 * Headed GUI test: open publish.site, connect Facebook via OAuth popup.
 *
 * Prerequisites:
 * - publish.site on http://localhost:7001
 * - publish.api on http://localhost:5238 (+ https://localhost:7247 for OAuth callback)
 *
 * Preferred: attach to Chrome started with remote debugging so your Facebook
 * session is reused:
 *   chrome.exe --remote-debugging-port=9222
 *   set PUBLISH_E2E_CDP_URL=http://127.0.0.1:9222
 *
 * Fallback: persistent profile under .playwright/fb-profile.
 *
 * Usage:
 *   npm run test:e2e:facebook-connect
 */
import { chromium } from "playwright";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.PUBLISH_SITE_URL ?? "http://localhost:7001";
const USER_ID =
  process.env.PUBLISH_E2E_USER_ID ?? "e210952c-6ef5-4752-ade4-4e06a6292ea7";
const PROFILE_DIR = path.resolve(__dirname, "..", ".playwright", "fb-profile");
const ARTIFACT_DIR = path.resolve(__dirname, "..", ".playwright", "artifacts");
const CDP_URL = process.env.PUBLISH_E2E_CDP_URL ?? "";
const USE_PREVIOUS_SETTINGS = process.env.PUBLISH_E2E_FB_PREVIOUS_SETTINGS === "1";
const TIMEOUT_MS = 3 * 60 * 1000;

async function seedAuth(context) {
  await context.addInitScript(
    ({ userId }) => {
      window.localStorage.setItem("publish_auth", "1");
      window.localStorage.setItem("publish_user_id", userId);
    },
    { userId: USER_ID },
  );
}

async function clickIfVisible(locator, label, timeout = 2500) {
  try {
    await locator.first().waitFor({ state: "visible", timeout });
    await locator.first().click({ timeout: 5000 });
    console.log(`Clicked: ${label}`);
    return true;
  } catch {
    return false;
  }
}

function isFacebookConnectedStatus(statusText) {
  const text = (statusText ?? "").trim();
  if (!text) return false;
  if (/^not connected$/i.test(text)) return false;
  if (/connecting/i.test(text)) return false;
  if (/connection error/i.test(text)) return false;
  return /^connected(\s+as\b)?/i.test(text);
}

async function dumpPages(context, label) {
  const pages = context.pages();
  console.log(`[${label}] open pages (${pages.length}):`);
  for (const p of pages) {
    console.log(`  - ${p.isClosed() ? "(closed)" : p.url()}`);
  }
}

async function waitForOAuthPopup(context, pagesBefore, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const pages = context.pages().filter((p) => !p.isClosed());
    for (const p of pages) {
      const url = p.url();
      const isNew = !pagesBefore.has(p);
      const looksOauth =
        /facebook\.com/i.test(url) ||
        /dialog\/oauth/i.test(url) ||
        /connections\/callback/i.test(url) ||
        /localhost:7247/i.test(url) ||
        /localhost:5238/i.test(url);
      if (looksOauth) {
        console.log(`Found OAuth page: ${url}`);
        return p;
      }
      if (isNew && url && url !== "about:blank") {
        console.log(`Found new page: ${url}`);
        return p;
      }
      if (isNew && (!url || url === "about:blank")) {
        // Wait briefly for navigation on blank popup
        try {
          await p.waitForURL(
            /(facebook\.com|localhost:7001|localhost:7247|localhost:5238|connections\/callback)/i,
            { timeout: 5000 },
          );
          console.log(`Blank popup navigated to: ${p.url()}`);
          return p;
        } catch {
          // keep waiting
        }
      }
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  await dumpPages(context, "oauth-timeout");
  throw new Error("Timed out waiting for Facebook OAuth popup/page.");
}

async function handleFacebookPopup(popup, parentPage) {
  console.log(`Handling OAuth page: ${popup.url() || "(empty)"}`);
  await popup.bringToFront().catch(() => {});
  await popup.waitForLoadState("domcontentloaded").catch(() => {});

  const deadline = Date.now() + TIMEOUT_MS;
  let lastUrl = "";
  while (Date.now() < deadline) {
    // Parent may finish via postMessage / poll even if popup handling is slow
    const parentStatus = await parentPage
      .locator(".platform-option:has-text('Facebook') .platform-option-status")
      .innerText()
      .catch(() => "");
    if (isFacebookConnectedStatus(parentStatus)) {
      console.log(`Parent already shows connected: ${parentStatus}`);
      return;
    }
    const modalError = await parentPage.locator(".modal .flash-error").innerText().catch(() => "");
    if (modalError && !/Connecting/i.test(modalError)) {
      throw new Error(`GUI reported error: ${modalError}`);
    }

    if (popup.isClosed()) {
      console.log("OAuth popup closed; waiting for parent status...");
      await parentPage.waitForTimeout(3000);
      const afterClose = await parentPage
        .locator(".platform-option:has-text('Facebook') .platform-option-status")
        .innerText()
        .catch(() => "");
      if (isFacebookConnectedStatus(afterClose)) return;
      // Popup closed early — keep polling parent a bit more below via loop continue with no popup
      return;
    }

    const url = popup.url();
    if (url !== lastUrl) {
      console.log(`OAuth URL: ${url}`);
      lastUrl = url;
    }

    if (
      url.includes("/connections/callback") ||
      (url.includes("localhost:7001") && url.includes("callback"))
    ) {
      console.log(`On Publish callback page: ${url}`);
      if (/status=error/i.test(url)) {
        await popup.waitForTimeout(800);
        const text = await popup.locator("main, body").innerText().catch(() => "");
        throw new Error(`OAuth callback returned status=error:\n${text.slice(0, 800)}`);
      }
      const pageRadios = popup.locator('input[name="facebook-page"]');
      const radioCount = await pageRadios.count();
      if (radioCount > 0) {
        console.log(`Page picker shown with ${radioCount} page(s). Selecting first.`);
        await pageRadios.first().check({ force: true }).catch(async () => {
          await pageRadios.first().click({ force: true });
        });
        await clickIfVisible(
          popup.locator("button:has-text('Connect selected Page')"),
          "Connect selected Page",
          10000,
        );
        // Callback page closes itself after notifyOpener — treat that as success path.
        await Promise.race([
          popup.waitForEvent("close", { timeout: 15000 }).catch(() => null),
          popup.waitForTimeout(3000).catch(() => null),
        ]);
        return;
      }

      const connected = await popup
        .locator("text=/Connected/i")
        .first()
        .isVisible()
        .catch(() => false);
      if (connected) {
        console.log("Callback reports connected.");
        await popup.waitForTimeout(1200);
        return;
      }

      const failed = await popup
        .locator("text=/Connection failed|No Facebook Pages|not detected|Edit settings/i")
        .first()
        .isVisible()
        .catch(() => false);
      if (failed) {
        const text = await popup.locator("main, body").innerText().catch(() => "");
        throw new Error(`OAuth callback failed:\n${text.slice(0, 800)}`);
      }
    }

    // Meta consent uses plain DIVs (not <button>). Prefer Edit settings so Pages are granted.
    const editSettings = popup.getByText("Edit settings", { exact: true });

    // Repro mode: accept previous settings, which is what users click and which makes
    // Facebook return an empty Pages list.
    if (USE_PREVIOUS_SETTINGS && (await editSettings.isVisible().catch(() => false))) {
      console.log("Repro mode: clicking Continue (previous settings) instead of Edit settings.");
      await popup.getByText("Continue", { exact: true }).click({ timeout: 5000 });
      await popup.waitForTimeout(1500);
      continue;
    }

    if (await editSettings.isVisible().catch(() => false)) {
      console.log("Opening Edit settings...");
      await editSettings.click({ timeout: 5000 });
      await popup.waitForTimeout(1500);
    }

    // Page picker: "Choose the Pages you want …"
    const pagesChooser = popup.getByText(/Choose the Pages you want/i);
    if (await pagesChooser.isVisible().catch(() => false)) {
      console.log("Facebook Pages chooser visible.");
      const optInAll = popup.getByText("Opt in to all current and future Pages", {
        exact: true,
      });
      if (await optInAll.isVisible().catch(() => false)) {
        await optInAll.click({ timeout: 5000 });
        console.log("Clicked: Opt in to all current and future Pages");
        await popup.waitForTimeout(500);
      }
      const selectAll = popup.getByText("Select all", { exact: true });
      if (await selectAll.isVisible().catch(() => false)) {
        await selectAll.click({ timeout: 5000 });
        console.log("Clicked: Select all");
        await popup.waitForTimeout(500);
      }
      const boxes = popup.locator(
        'input[type="checkbox"], [role="checkbox"], [role="switch"]',
      );
      const boxCount = await boxes.count();
      console.log(`Permission controls found: ${boxCount}`);
      for (let i = 0; i < boxCount; i++) {
        const box = boxes.nth(i);
        const checked =
          (await box.isChecked().catch(() => false)) ||
          (await box.getAttribute("aria-checked").catch(() => null)) === "true";
        if (!checked) await box.click({ force: true }).catch(() => {});
      }
      await popup.getByText("Continue", { exact: true }).click({ timeout: 5000 });
      console.log("Clicked: Continue (after page selection)");
      await popup.waitForTimeout(1500);
      continue;
    }

    // Review permissions → Save
    const review = popup.getByText(/Review .+ access request/i);
    if (await review.isVisible().catch(() => false)) {
      console.log("Facebook access review visible.");
      const save = popup.getByText("Save", { exact: true });
      await save.click({ timeout: 5000 });
      console.log("Clicked: Save (access review)");
      await popup.waitForTimeout(2000);
      continue;
    }

    // Got it / final confirmation
    const gotIt = popup.getByText("Got it", { exact: true });
    if (await gotIt.isVisible().catch(() => false)) {
      await gotIt.click({ timeout: 5000 });
      console.log("Clicked: Got it");
      await popup.waitForTimeout(1500);
      continue;
    }

    // First-time flow: Continue when Edit settings is not offered
    const editVisible = await editSettings.isVisible().catch(() => false);
    if (!editVisible) {
      const cont = popup.getByText("Continue", { exact: true });
      if (await cont.isVisible().catch(() => false)) {
        await cont.click({ timeout: 5000 });
        console.log("Clicked: Continue");
        await popup.waitForTimeout(1000);
      }
      await clickIfVisible(popup.locator("button:has-text('Allow')"), "Allow", 800);
      await clickIfVisible(popup.locator("button:has-text('OK')"), "OK", 800);
    }

    await popup.waitForTimeout(800).catch(() => {});
  }

  throw new Error("Timed out waiting for Facebook OAuth / page selection to finish.");
}

async function openPlatformModal(page) {
  const idea = "E2E Facebook connect test idea for Cliposts Publish.";
  const textarea = page.locator("#generator textarea");
  await textarea.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForLoadState("networkidle").catch(() => {});

  const generateButton = page.locator("#generator button:has-text('Generate campaign')").first();
  const modal = page.locator(".modal:has-text('Select platform')");

  // Until React has hydrated, filling the textarea updates the DOM but not component
  // state, so "Generate campaign" reports an empty idea. Retry until the state sticks.
  for (let attempt = 1; attempt <= 8; attempt++) {
    await textarea.fill("");
    await textarea.fill(idea);
    await generateButton.click();

    try {
      await modal.waitFor({ state: "visible", timeout: 4000 });
      return;
    } catch {
      const notice = await page.locator("#generator .flash-error").innerText().catch(() => "");
      console.log(
        `Platform modal not open yet (attempt ${attempt}/8)` +
          (notice ? `, generator says: ${notice.trim()}` : ""),
      );
      await page.waitForTimeout(1000);
    }
  }

  throw new Error("Platform modal never opened - the generator page may not have hydrated.");
}

async function launchBrowser() {
  if (CDP_URL) {
    console.log(`Connecting over CDP: ${CDP_URL}`);
    const browser = await chromium.connectOverCDP(CDP_URL);
    const context = browser.contexts()[0] ?? (await browser.newContext());
    return {
      browser,
      context,
      usingCdp: true,
      // Do not call browser.close() — that kills the user's Chrome.
      close: async () => {},
    };
  }

  fs.mkdirSync(PROFILE_DIR, { recursive: true });
  console.log(`Launching Chrome with isolated profile: ${PROFILE_DIR}`);
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: "chrome",
    viewport: { width: 1280, height: 900 },
    ignoreHTTPSErrors: true,
    args: ["--disable-blink-features=AutomationControlled"],
  });
  return {
    browser: null,
    context,
    usingCdp: false,
    close: async () => context.close(),
  };
}

async function main() {
  fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`User id: ${USER_ID}`);

  const { context, close, usingCdp } = await launchBrowser();
  await seedAuth(context);

  // Prefer an existing localhost tab when attached via CDP
  let page =
    context.pages().find((p) => p.url().includes("localhost:7001")) ??
    context.pages()[0] ??
    (await context.newPage());

  try {
    // Background tabs get throttled; make sure we drive a focused, foreground tab.
    await page.bringToFront();
    for (const other of context.pages()) {
      if (other !== page && other.url().startsWith("chrome-error://")) {
        await other.close().catch(() => {});
      }
    }

    await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.evaluate((userId) => {
      window.localStorage.setItem("publish_auth", "1");
      window.localStorage.setItem("publish_user_id", userId);
    }, USER_ID);
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.bringToFront();

    await openPlatformModal(page);

    await page.locator(".platform-option:has-text('Facebook')").first().click();
    console.log("Selected Facebook platform.");

    const disconnectBtn = page.locator(
      ".platform-option:has-text('Facebook') button:has-text('Disconnect')",
    );
    if (await disconnectBtn.count()) {
      console.log("Facebook already connected — disconnecting first.");
      await disconnectBtn.first().click();
      await page.waitForTimeout(2500);
    }

    const pagesBefore = new Set(context.pages());
    await dumpPages(context, "before-connect");

    // Capture authUrl from API for debugging / fallback navigation
    const connectResponsePromise = page
      .waitForResponse(
        (res) =>
          /\/api\/publish\/connections\/facebook/i.test(res.url()) &&
          res.request().method() === "POST",
        { timeout: 8000 },
      )
      .catch(() => null);

    const connectBtn = page.locator("button:has-text('Connect Facebook')");
    await connectBtn.waitFor({ state: "visible", timeout: 15000 });
    await connectBtn.click();
    console.log("Clicked Connect Facebook.");

    let authUrl = null;
    const connectRes = await connectResponsePromise;
    if (connectRes) {
      const body = await connectRes.json().catch(() => null);
      authUrl = body?.authUrl ?? body?.AuthUrl ?? null;
      console.log(`Connect API status=${connectRes.status()} authUrl=${authUrl ? "yes" : "no"}`);
      if (authUrl) console.log(`authUrl: ${authUrl.slice(0, 120)}...`);
    } else {
      console.warn("Did not capture connect API response (continuing).");
    }

    let popup;
    try {
      popup = await waitForOAuthPopup(context, pagesBefore, 45000);
    } catch (e) {
      if (authUrl) {
        console.warn(`${e} — opening authUrl in a new page as fallback.`);
        popup = await context.newPage();
        await popup.goto(authUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      } else {
        throw e;
      }
    }

    await handleFacebookPopup(popup, page);

    const deadline = Date.now() + 90000;
    let connected = false;
    while (Date.now() < deadline) {
      const statusText = await page
        .locator(".platform-option:has-text('Facebook') .platform-option-status")
        .innerText()
        .catch(() => "");
      console.log(`Facebook status: ${statusText}`);
      if (isFacebookConnectedStatus(statusText)) {
        connected = true;
        break;
      }
      const modalError = await page.locator(".modal .flash-error").innerText().catch(() => "");
      if (modalError) {
        throw new Error(`GUI reported error: ${modalError}`);
      }
      await page.waitForTimeout(2000);
    }

    if (!connected) {
      const modalMsgs = await page
        .locator(".modal .flash-error, .modal .note")
        .allInnerTexts()
        .catch(() => []);
      throw new Error(
        `Facebook did not reach Connected in the GUI. Modal messages: ${modalMsgs.join(" | ") || "(none)"}`,
      );
    }

    console.log("PASS: Facebook connect GUI flow completed.");
  } catch (error) {
    const shot = path.join(ARTIFACT_DIR, `facebook-connect-fail-${Date.now()}.png`);
    await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
    console.error(`Screenshot saved: ${shot}`);
    await dumpPages(context, "fail");
    throw error;
  } finally {
    if (!usingCdp) {
      await close();
    } else {
      console.log("Leaving Chrome open (CDP mode).");
      // Disconnect Playwright without killing Chrome
      await close();
    }
  }
}

main().catch((error) => {
  console.error("FAIL:", error);
  process.exitCode = 1;
});
