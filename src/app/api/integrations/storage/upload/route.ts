import { NextResponse } from "next/server";
import { StorageService } from "@/integrations/storage";
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

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const bucket = (formData.get("bucket") as string) || "crm-files";
    const path = (formData.get("path") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "Arquivo é obrigatório." }, { status: 400 });
    }

    if (!path) {
      return NextResponse.json({ error: "Caminho do arquivo é obrigatório." }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo excede o limite de 10MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const service = new StorageService();
    const result = await service.upload({
      bucket,
      path,
      content: buffer,
      contentType: file.type || undefined,
    });

    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: sanitizeError(error) }, { status: 500 });
  }
}
