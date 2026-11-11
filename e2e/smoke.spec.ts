import { expect, test, type Page } from "@playwright/test";

const mockEvmAccount = "0x1111111111111111111111111111111111111111";

async function installMockMetaMask(page: Page) {
  await page.addInitScript((account) => {
    Object.defineProperty(window, "ethereum", {
      value: {
        isMetaMask: true,
        async request({ method }: { method: string }) {
          if (method === "eth_requestAccounts" || method === "eth_accounts") return [account];
          if (method === "eth_chainId") return "0x30d4a";
          if (method === "wallet_switchEthereumChain") return null;
          throw new Error(`Unsupported mock method ${method}`);
        },
        on() {},
        removeListener() {},
      },
    });
  }, mockEvmAccount);
}

test("home explains the product and lists open polls", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("One vote.");
  await expect(page.getByTestId("network-health")).toContainText("Preview");
  await expect(page.getByText("Which Rome feature should builders demo first?")).toBeVisible();
  await expect(page.getByText("Best time for the weekly builder call?")).toHaveCount(0);
});

test("filters switch between open and closed polls", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Closed", exact: true }).click();
  await expect(page.getByText("Best time for the weekly builder call?")).toBeVisible();
  await expect(page.getByText("Which Rome feature should builders demo first?")).toHaveCount(0);
  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(page.locator(".poll-card")).toHaveCount(3);
});

test("poll page shows the EVM and Solana split", async ({ page }) => {
  await page.goto("/");
  await page.getByText("Which Rome feature should builders demo first?").click();
  await expect(page).toHaveURL(/\/poll\/3$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Which Rome feature");
  await expect(page.getByText("14 EVM · 19 Solana")).toBeVisible();
  await expect(page.getByRole("button", { name: /Vote for Atomic Solana CPI/ })).toBeVisible();
});

test("closed polls show a winner and no vote buttons", async ({ page }) => {
  await page.goto("/poll/1");
  await expect(page.getByText(/14:00 · winner/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Vote for/ })).toHaveCount(0);
});

test("unknown and invalid polls render not-found states", async ({ page }) => {
  await page.goto("/poll/99");
  await expect(page.getByRole("heading", { name: "Poll not found." })).toBeVisible();
  await page.goto("/poll/abc");
  await expect(page.getByText("This page could not be found.")).toBeVisible();
});

test("voting without a wallet asks the user to connect", async ({ page }) => {
  await page.goto("/poll/3");
  await page.getByRole("button", { name: /Vote for Shared liquidity/ }).click();
  await expect(page.locator(".form-error")).toContainText(/Connect MetaMask or Solflare/);
});

test("create poll validates input and stays read-only in preview", async ({ page }) => {
  await installMockMetaMask(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Connect MetaMask" }).click();
  await expect(page.getByRole("button", { name: `Use MetaMask address ${mockEvmAccount}` })).toBeVisible();

  await page.getByRole("button", { name: "Create a poll" }).click();
  const dialog = page.getByRole("dialog", { name: "Open a new poll" });
  await dialog.locator('input[name="question"]').fill("Ship it?");
  await dialog.getByRole("textbox", { name: "Option 1" }).fill("Yes");
  await dialog.getByRole("textbox", { name: "Option 2" }).fill("yes");
  await dialog.getByRole("button", { name: "Open poll" }).click();
  await expect(dialog.getByRole("alert")).toContainText("different");

  await dialog.getByRole("textbox", { name: "Option 2" }).fill("No");
  await dialog.getByRole("button", { name: "Add option" }).click();
  await dialog.getByRole("textbox", { name: "Option 3" }).fill("Later");
  await dialog.getByRole("button", { name: "Open poll" }).click();
  await expect(dialog.getByRole("alert")).toContainText(/read-only/);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});

test("responses carry security headers", async ({ request }) => {
  const headers = (await request.get("/")).headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});
