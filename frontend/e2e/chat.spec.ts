import { expect, test } from "@playwright/test";

test("chat streaming and session switching flow", async ({ page }) => {
  const sessions = [
    { id: "s1", title: "First Session" },
    { id: "s2", title: "Second Session" }
  ];

  await page.route("**/api/models", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ provider: "ollama", models: ["qwen3:latest"] }])
    });
  });

  await page.route("**/api/sessions", async (route) => {
    if (route.request().method() === "GET") {
      const reqUrl = new URL(route.request().url());
      const messageSessionId = reqUrl.searchParams.get("id");
      if (messageSessionId === "s2") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ id: "m2", role: "assistant", content: "Loaded from second session" }])
        });
        return;
      }
      if (messageSessionId) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([{ id: "m1", role: "assistant", content: "Loaded from first session" }])
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(sessions)
      });
      return;
    }
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "s3", title: "New Chat" })
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/sessions/*", async (route) => {
    if (route.request().method() === "DELETE") {
      await route.fulfill({ status: 204, body: "" });
      return;
    }
    if (route.request().method() === "PATCH") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "s1", title: "Renamed Session" })
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: "<think>internal trace</think>\n\nHello from stream"
    });
  });

  await page.goto("/");
  await expect(page.getByText("Sessions", { exact: true })).toBeVisible();

  await page.getByText("Second Session", { exact: true }).click();

  await page.getByPlaceholder("Ask anything… (optional if you attach files)").first().fill("Say hello");
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByText("Hello from stream")).toBeVisible();
  await expect(page.locator("summary").filter({ hasText: "Thinking (~" })).toBeVisible();

  await page.locator("button[data-session-menu]").first().click();
  await page.locator("button").filter({ hasText: "Delete" }).first().click();
  await expect(page.getByRole("button", { name: "First Session" })).toHaveCount(0);
});
