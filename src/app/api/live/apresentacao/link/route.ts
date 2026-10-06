import { NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * POST /api/live/apresentacao/link
 *
 * Converte um link externo (Google Drive ou URL direta) em
 * uma apresentação da Live.
 *
 * O download acontece NO SERVIDOR: o navegador não conseguiria
 * buscar o arquivo (CORS do Drive) e o pdf.js exige uma origem
 * mesma. O arquivo baixado é guardado no bucket "anexos" e a
 * apresentação é registrada — os espectadores recebem a URL
 * assinada normal, exatamente como num upload local.
 *
 * Só o anfitrião da sala pode abrir um link.
 */

const MAX_BYTES = 100 * 1024 * 1024; // 100 MB

const MIME_PERMITIDOS = [
  "application/pdf",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const EXTENSOES_PERMITIDAS = [".pdf", ".mp4", ".webm", ".mov"];

function resposta(erro: string, status: number) {
  return NextResponse.json({ erro }, { status });
}

/** Extrai o id de um link do Google Drive. */
function extrairIdDrive(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.includes("google.com")) return null;

    const segmentos = u.pathname.split("/");
    const indice = segmentos.indexOf("d");
    if (indice !== -1 && segmentos[indice + 1]) return segmentos[indice + 1];

    const id = u.searchParams.get("id");
    if (id) return id;

    return null;
  } catch {
    return null;
  }
}

function nomeLimpo(nome: string): string {
  const limpo = nome
    .replace(/[\\/:*?"<>|\s]+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 120);
  return limpo || "apresentacao";
}

function nomeDaUrl(url: string): string {
  try {
    const u = new URL(url);
    const segmento = decodeURIComponent(u.pathname.split("/").pop() ?? "");
    return segmento || "arquivo-do-link";
  } catch {
    return "arquivo-do-link";
  }
}

function ehTipoPermitido(mime: string, nome: string): boolean {
  if (MIME_PERMITIDOS.includes(mime)) return true;
  const nomeMinusculo = nome.toLowerCase();
  return EXTENSOES_PERMITIDAS.some((ext) => nomeMinusculo.endsWith(ext));
}

type ArquivoBaixado = {
  corpo: ArrayBuffer;
  nome: string;
  mime: string;
};

const CABECALHOS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
};

/**
 * Google Drive: o endpoint `uc?export=download` devolve o
 * arquivo direto para arquivos pequenos. Para arquivos maiores
 * (ou muitos downloads), devolve uma página HTML de
 * confirmação de vírus — o formulário dessa página carrega o
 * token `confirm` que libera o download real.
 */
async function baixarDrive(id: string): Promise<ArquivoBaixado> {
  const urlBase = `https://drive.google.com/uc?export=download&id=${id}`;
  let resposta = await fetch(urlBase, {
    redirect: "follow",
    headers: CABECALHOS,
  });

  if (resposta.headers.get("content-type")?.includes("text/html")) {
    const html = await resposta.text();
    const formulario = html.match(
      /<form[^>]*action="([^"]+)"[^>]*>[\s\S]{0,4000}?name="confirm"\s+value="([^"]+)"/,
    );
    const confirmacao = formulario
      ? formulario[2]
      : html.match(/name="confirm"\s+value="([^"]+)"/)?.[1];

    if (!confirmacao) {
      throw new Error("link_drive_negado");
    }

    const acao = formulario
      ? formulario[1].replace(/&amp;/g, "&")
      : urlBase;
    resposta = await fetch(`${acao}&confirm=${confirmacao}`, {
      redirect: "follow",
      headers: CABECALHOS,
    });
  }

  if (!resposta.ok) {
    throw new Error("falha_download");
  }

  const mime = (resposta.headers.get("content-type") ?? "application/octet-stream")
    .split(";")[0]
    .trim();

  if (mime.includes("text/html")) {
    // Documentos do Google (Docs/Sheets) não têm download
    // direto: precisam ser exportados como PDF antes.
    throw new Error("link_nao_suportado");
  }

  const tamanho = Number(resposta.headers.get("content-length") ?? "0");
  if (tamanho > MAX_BYTES) {
    throw new Error("arquivo_grande");
  }

  const corpo = await resposta.arrayBuffer();
  if (corpo.byteLength > MAX_BYTES) {
    throw new Error("arquivo_grande");
  }

  const disposicao = resposta.headers.get("content-disposition") ?? "";
  const nome =
    disposicao.match(/filename\*?=(?:UTF-8''|")?([^";]+)/)?.[1]?.trim() ??
    `arquivo-do-drive`;

  return { corpo, nome: nomeLimpo(nome), mime };
}

/** URL direta de qualquer origem. */
async function baixarDireto(url: string): Promise<ArquivoBaixado> {
  const resposta = await fetch(url, {
    redirect: "follow",
    headers: CABECALHOS,
  });

  if (!resposta.ok) {
    throw new Error("falha_download");
  }

  const mime = (resposta.headers.get("content-type") ?? "application/octet-stream")
    .split(";")[0]
    .trim();

  if (mime.includes("text/html")) {
    throw new Error("link_nao_suportado");
  }

  const tamanho = Number(resposta.headers.get("content-length") ?? "0");
  if (tamanho > MAX_BYTES) {
    throw new Error("arquivo_grande");
  }

  const corpo = await resposta.arrayBuffer();
  if (corpo.byteLength > MAX_BYTES) {
    throw new Error("arquivo_grande");
  }

  const disposicao = resposta.headers.get("content-disposition") ?? "";
  const nome =
    disposicao.match(/filename\*?=(?:UTF-8''|")?([^";]+)/)?.[1]?.trim() ??
    nomeDaUrl(url);

  return { corpo, nome: nomeLimpo(nome), mime };
}

export async function POST(request: Request) {
  try {
    // Autenticação pela sessão (cookies do servidor).
    const supabase = await createClient();
    const {
      data: { user },
      error: erroAuth,
    } = await supabase.auth.getUser();

    if (erroAuth || !user) {
      return resposta("nao_autenticado", 401);
    }

    const corpo = (await request.json().catch(() => null)) as
      | { liveId?: string; url?: string }
      | null;
    const liveId = corpo?.liveId?.trim();
    const url = corpo?.url?.trim();

    if (!liveId || !url) {
      return resposta("dados_invalidos", 400);
    }

    // Somente o anfitrião abre links na sala.
    const { data: live, error: erroLive } = await supabase
      .from("live_rooms")
      .select("id, anfitriao_id")
      .eq("id", liveId)
      .single();

    if (erroLive || !live) {
      return resposta("live_nao_encontrada", 404);
    }
    if (live.anfitriao_id !== user.id) {
      return resposta("sem_permissao", 403);
    }

    // Download no servidor.
    const idDrive = extrairIdDrive(url);
    const arquivo = idDrive ? await baixarDrive(idDrive) : await baixarDireto(url);

    if (!ehTipoPermitido(arquivo.mime, arquivo.nome)) {
      return resposta("link_nao_suportado", 400);
    }

    // Mesmo armazenamento do upload local: bucket "anexos"
    // privado + registro em public.anexos.
    const admin = createAdminClient();
    const caminho = `${user.id}/live_apresentacao/${liveId}/${Date.now()}-${arquivo.nome}`;

    const blob = new Blob([arquivo.corpo], { type: arquivo.mime });
    const { error: erroUpload } = await admin
      .storage.from("anexos")
      .upload(caminho, blob, { cacheControl: "3600", upsert: false });

    if (erroUpload) {
      console.error("[API live/apresentacao/link] upload:", erroUpload);
      return resposta("falha_upload", 500);
    }

    // Uma apresentação aberta por sala: fecha a anterior
    // antes de abrir a nova (índice único parcial).
    const agora = new Date().toISOString();
    const { error: erroAnterior } = await admin
      .from("live_apresentacoes")
      .update({ encerrada_em: agora })
      .eq("live_id", liveId)
      .is("encerrada_em", null);
    if (erroAnterior) {
      console.error("[API live/apresentacao/link] fechar anterior:", erroAnterior);
    }

    const tipo =
      arquivo.mime.includes("pdf") || arquivo.nome.toLowerCase().endsWith(".pdf")
        ? "pdf"
        : "video";

    const { data: apresentacao, error: erroInsert } = await admin
      .from("live_apresentacoes")
      .insert({
        live_id: liveId,
        tipo,
        titulo: arquivo.nome,
        caminho,
        mime_type: arquivo.mime,
        iniciado_por: user.id,
      })
      .select()
      .single();

    if (erroInsert || !apresentacao) {
      console.error("[API live/apresentacao/link] insert:", erroInsert);
      await admin.storage.from("anexos").remove([caminho]);
      return resposta("falha_registro", 500);
    }

    const { data: anexo, error: erroAnexo } = await admin
      .from("anexos")
      .insert({
        entity_type: "live_apresentacao",
        entity_id: apresentacao.id,
        nome: arquivo.nome,
        caminho,
        tipo: arquivo.mime,
        tamanho: arquivo.corpo.byteLength,
        usuario_id: user.id,
      })
      .select()
      .single();

    if (erroAnexo || !anexo) {
      console.error("[API live/apresentacao/link] anexo:", erroAnexo);
      await admin.storage.from("anexos").remove([caminho]);
      return resposta("falha_registro", 500);
    }

    const { error: erroAtualiza } = await admin
      .from("live_apresentacoes")
      .update({ anexo_id: anexo.id, caminho, mime_type: arquivo.mime })
      .eq("id", apresentacao.id);
    if (erroAtualiza) {
      console.error("[API live/apresentacao/link] atualiza:", erroAtualiza);
    }

    return NextResponse.json({ ok: true, tipo });
  } catch (e) {
    // Erros de negócio já têm código; qualquer outro é falha.
    const codigo = e instanceof Error ? e.message : "falha_apresentacao";
    const conhecidos = [
      "link_drive_negado",
      "link_nao_suportado",
      "arquivo_grande",
      "falha_download",
    ];
    if (conhecidos.includes(codigo)) {
      return resposta(codigo, 400);
    }
    console.error("[API live/apresentacao/link] erro:", e);
    return resposta("falha_apresentacao", 500);
  }
}
