import { NextRequest } from "next/server";

const backendBaseUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:37891";

export async function POST(request: NextRequest) {
  const body = await request.text();

  try {
    const response = await fetch(`${backendBaseUrl}/api/v1/chat/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    if (!response.ok || !response.body) {
      return new Response("Backend stream failed", { status: 502 });
    }

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache"
      }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ detail: `Backend unreachable at ${backendBaseUrl}: ${message}` }),
      { status: 502, headers: { "Content-Type": "application/json" } }
    );
  }
}
