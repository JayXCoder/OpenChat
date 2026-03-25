import { NextRequest } from "next/server";

import { forwardProviderOverrideHeaders } from "@/lib/provider-settings";

const backendBaseUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:37891";

export async function POST(request: NextRequest) {
  const body = await request.text();

  try {
    const upstream = new Headers({ "Content-Type": "application/json" });
    forwardProviderOverrideHeaders(request.headers, upstream);
    const response = await fetch(`${backendBaseUrl}/api/v1/chat/stream`, {
      method: "POST",
      headers: upstream,
      body
    });

    if (!response.ok || !response.body) {
      return new Response("Backend stream failed", { status: 502 });
    }

    const startTime = response.headers.get("X-Start-Time");
    const outHeaders: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache"
    };
    if (startTime) {
      outHeaders["X-Start-Time"] = startTime;
    }

    return new Response(response.body, {
      status: response.status,
      headers: outHeaders
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ detail: `Backend unreachable at ${backendBaseUrl}: ${message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
