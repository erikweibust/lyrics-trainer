import { test, expect } from "@playwright/test";

const LINE_1 = "Shall I compare thee to a summer's day?";
const LINE_2 = "Thou art more lovely and more temperate:";
const LINE_3 = "Rough winds do shake the darling buds of May,";

const counter = (page) => page.locator("#counter");
const line = (page) => page.locator("#line");

// Only genuine application faults count: a page error, or console.error /
// console.warn from the app. Vite's dev-server chatter is ignored.
function collectErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    if (/\/@vite\/|vite\b.*(hmr|connect)/i.test(msg.text())) return;
    errors.push(msg.type() + ": " + msg.text());
  });
  return errors;
}

test("navigates forward and back, remembers the line, and logs nothing", async ({ page }) => {
  const errors = collectErrors(page);

  // Each test gets a fresh browser context, so localStorage starts empty and
  // the first assertion really is "starts at line 1". Clearing it in an init
  // script would instead wipe the place before the reload check below.
  await page.goto("/");

  await expect(counter(page)).toHaveText("Line 1 of 14");
  await expect(line(page)).toHaveText(LINE_1);
  await expect(page.locator("#prev")).toBeDisabled();

  await page.locator("#next").click();
  await expect(counter(page)).toHaveText("Line 2 of 14");
  await expect(line(page)).toHaveText(LINE_2);

  await page.keyboard.press("ArrowRight");
  await expect(counter(page)).toHaveText("Line 3 of 14");
  await expect(line(page)).toHaveText(LINE_3);

  await page.locator("#prev").click();
  await expect(counter(page)).toHaveText("Line 2 of 14");
  await expect(line(page)).toHaveText(LINE_2);

  // The saved place survives a reload — and the two-line history rebuilds.
  await page.reload();
  await expect(counter(page)).toHaveText("Line 2 of 14");
  await expect(line(page)).toHaveText(LINE_2);
  await expect(page.locator("#past-1")).toHaveText(LINE_1);

  expect(errors).toEqual([]);
});
