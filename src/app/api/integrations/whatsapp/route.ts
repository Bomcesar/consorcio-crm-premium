import { NextResponse } from "next/server";
import { WhatsAppService } from "@/integrations/whatsapp";
import { createClient } from "@/lib/supabase/server";
import { sanitizeError } from "@/lib/security";

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
    const { to, message, templateName, languageCode, components } = body ?? {};

    if (!to) {
      return NextResponse.json({ error: "Destinatário é obrigatório." }, { status: 400 });
    }

    const service = new WhatsAppService();

    let result;
    if (templateName) {
      result = await service.sendTemplateMessage(to, templateName, languageCode, components);
    } else if (message) {
      result = await service.sendMessage({ to, message });
    } else {
      return NextResponse.json(
        { error: "Informe message ou templateName." },
        { status: 400 },
      );
    }

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
