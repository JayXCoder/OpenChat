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
      body: "\u003cthink\u003einternal trace\u003c/think\u003e\n\nHello from stream"
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

test("model selection is reflected in streamed mock response", async ({ page }) => {
  await page.route("**/api/models", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ provider: "ollama", models: ["qwen3:latest", "llama3:latest"] }])
    });
  });

  await page.route("**/api/sessions", async (route) => {
    if (route.request().method() === "GET") {
      const id = new URL(route.request().url()).searchParams.get("id");
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(id ? [] : [])
      });
      return;
    }
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "model-sess", title: "T" })
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/sessions/*", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/chat", async (route) => {
    const raw = route.request().postData();
    const body = raw ? (JSON.parse(raw) as { model?: string }) : {};
    const model = body.model ?? "";
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      headers: { "X-Start-Time": "1700000000000" },
      body: `ECHO_MODEL:${model}`
    });
  });

  await page.goto("/");
  await expect(page.getByText("Sessions", { exact: true })).toBeVisible();

  await page.locator("aside select").nth(1).selectOption("llama3:latest");

  await page.getByPlaceholder("Ask anything… (optional if you attach files)").first().fill("ping");
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByText("ECHO_MODEL:llama3:latest")).toBeVisible();
});

test("new chat clears the transcript surface", async ({ page }) => {
  await page.route("**/api/models", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ provider: "ollama", models: ["qwen3:latest"] }])
    });
  });

  await page.route("**/api/sessions", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
      return;
    }
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "nc1", title: "New Chat" })
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/sessions/*", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/chat", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: "First reply"
    });
  });

  await page.goto("/");
  await page.getByPlaceholder("Ask anything… (optional if you attach files)").first().fill("Hi");
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByText("First reply")).toBeVisible();

  let created = 0;
  await page.unroute("**/api/sessions");
  await page.route("**/api/sessions", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
      return;
    }
    if (route.request().method() === "POST") {
      created += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: `nc-${created}`, title: "New Chat" })
      });
      return;
    }
    await route.fallback();
  });

  await page.locator("aside").getByText("New Chat", { exact: true }).click();
  await expect(page.getByText("OPEN CHAT")).toBeVisible();
});

test("attachment-only send hits the chat API with files", async ({ page }) => {
  await page.route("**/api/models", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ provider: "ollama", models: ["qwen3:latest"] }])
    });
  });

  await page.route("**/api/sessions", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([])
      });
      return;
    }
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "att-sess", title: "New Chat" })
      });
      return;
    }
    await route.fallback();
  });

  await page.route("**/api/sessions/*", async (route) => {
    await route.fulfill({ status: 204, body: "" });
  });

  await page.route("**/api/chat", async (route) => {
    const raw = route.request().postData();
    const body = raw ? (JSON.parse(raw) as { attachments?: unknown[] }) : {};
    const hasAtt = Array.isArray(body.attachments) && body.attachments.length > 0;
    await route.fulfill({
      status: 200,
      contentType: "text/plain; charset=utf-8",
      body: hasAtt ? "Got your file" : "No file"
    });
  });

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "note.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("hello")
  });
  await expect(page.getByText("note.txt")).toBeVisible();
  await page.getByRole("button", { name: "Send" }).first().click();
  await expect(page.getByText("Got your file")).toBeVisible();
});
