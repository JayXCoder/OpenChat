import { NextRequest } from "next/server";

const backendBaseUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:37891";

export async function POST(request: NextRequest) {
  const body = await request.text();

  try {
    const response = await fetch(`${backendBaseUrl}/api/v1/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ detail: `Backend unreachable at ${backendBaseUrl}: ${message}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}

export async function GET(request: NextRequest) {
  const sessionId = request.nextUrl.searchParams.get("id");

  try {
    if (sessionId) {
      const response = await fetch(`${backendBaseUrl}/api/v1/sessions/${sessionId}/messages`, {
        method: "GET",
        cache: "no-store"
      });

      const text = await response.text();
      return new Response(text, {
        status: response.status,
        headers: { "Content-Type": "application/json" }
      });
    }

    const response = await fetch(`${backendBaseUrl}/api/v1/sessions`, {
      method: "GET",
      cache: "no-store"
    });

    const text = await response.text();
    return new Response(text, {
      status: response.status,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ detail: `Backend unreachable at ${backendBaseUrl}: ${message}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
