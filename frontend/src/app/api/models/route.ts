const backendBaseUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:37891";

export async function GET() {
  try {
    const response = await fetch(`${backendBaseUrl}/api/v1/models`, {
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
