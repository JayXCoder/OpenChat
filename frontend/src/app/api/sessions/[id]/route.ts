import { NextRequest } from "next/server";

const backendBaseUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:37891";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await request.text();

  try {
    const response = await fetch(`${backendBaseUrl}/api/v1/sessions/${id}`, {
      method: "PATCH",
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

export async function DELETE(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;

  try {
    const response = await fetch(`${backendBaseUrl}/api/v1/sessions/${id}`, {
      method: "DELETE"
    });

    return new Response(null, {
      status: response.status
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ detail: `Backend unreachable at ${backendBaseUrl}: ${message}` }), {
      status: 502,
      headers: { "Content-Type": "application/json" }
    });
  }
}
