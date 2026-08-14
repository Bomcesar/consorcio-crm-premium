import { NextResponse } from "next/server";
import { WebhookClient } from "@/integrations/webhooks";
import { createClient } from "@/lib/supabase/server";
import { isUrlAllowed, sanitizeError } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
    }

    const body = await request.json();
    const { url, payload } = body ?? {};

    if (!url || !payload) {
      return NextResponse.json(
        { error: "Campos obrigatórios: url, payload." },
        { status: 400 },
      );
    }

    if (!isUrlAllowed(url)) {
      return NextResponse.json(
        { error: "URL não permitida." },
        { status: 400 },
      );
    }

    const client = new WebhookClient();
    const result = await client.send(url, payload);

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
