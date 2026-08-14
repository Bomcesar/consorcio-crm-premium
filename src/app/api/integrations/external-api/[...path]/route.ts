import { NextResponse } from "next/server";
import { ExternalApiClient } from "@/integrations/external-api";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/security";

export async function GET(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, (await params).path, "GET");
}

export async function POST(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, (await params).path, "POST");
}

export async function PUT(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, (await params).path, "PUT");
}

export async function PATCH(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, (await params).path, "PATCH");
}

export async function DELETE(request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  return handleRequest(request, (await params).path, "DELETE");
}

async function handleRequest(
  request: Request,
  pathSegments: string[] = [],
  method: string,
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const path = pathSegments.length > 0 ? `/${pathSegments.join("/")}` : "";
    const client = new ExternalApiClient();

    let body: unknown = undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        body = await request.json();
      } catch {
        body = undefined;
      }
    }

    const result = await (client as unknown as Record<string, (path: string, body: unknown) => Promise<unknown>>)[
      method.toLowerCase()
    ](path, body);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
