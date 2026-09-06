export type RecrutamentoCandidato = {
  id?: string;
  nome: string;
  email: string;
  telefone: string;
  origem: string;
  status: string;
  tipo: string;
  genero: string;
  idade: number | null;
  cpf: string;
  rg: string;
  endereco: string;
  cidade: string;
  equipe: string;
  veio_por: string;
  indicacao: boolean;
  catho: boolean;
  instagram: boolean;
  linkedin: string;
  telegram: string;
  outros: string;
  trabalhou_vendas: boolean;
  trabalhou_comissionado: boolean;
  clt: boolean;
  conhecimento_office: boolean;
  entende_prospeccao: boolean;
  facilidade_equipe: boolean;
  disponibilidade_integral: boolean;
  disponibilidade_finais_semana: boolean;
  conhece_consorcios: boolean;
  conhece_ademicon: boolean;
  por_onde_conheceu: string;
  observacoes: string;
};

export function exportRecrutamentoCSV(candidatos: RecrutamentoCandidato[]): string {
  const headers = [
    "Nome",
    "Email",
    "Telefone",
    "Origem",
    "Status",
    "Tipo",
    "Gênero",
    "Idade",
    "CPF",
    "RG",
    "Endereço",
    "Cidade",
    "Equipe",
    "Veio por",
    "Indicação",
    "Catho",
    "Instagram",
    "LinkedIn",
    "Telegram",
    "Outros",
    "Trabalhou com vendas",
    "Trabalhou comissionado",
    "CLT",
    "Conhecimento Office",
    "Entende prospecção",
    "Facilidade equipe",
    "Disponibilidade integral",
    "Disponibilidade finais de semana",
    "Conhece consórcios",
    "Conhece Ademicon",
    "Por onde conheceu",
    "Observações",
  ];
  const rows = candidatos.map((c) => [
    c.nome,
    c.email,
    c.telefone,
    c.origem,
    c.status,
    c.tipo,
    c.genero,
    c.idade ?? "",
    c.cpf,
    c.rg,
    c.endereco,
    c.cidade,
    c.equipe,
    c.veio_por,
    c.indicacao ? "Sim" : "Não",
    c.catho ? "Sim" : "Não",
    c.instagram ? "Sim" : "Não",
    c.linkedin,
    c.telegram,
    c.outros,
    c.trabalhou_vendas ? "Sim" : "Não",
    c.trabalhou_comissionado ? "Sim" : "Não",
    c.clt ? "Sim" : "Não",
    c.conhecimento_office ? "Sim" : "Não",
    c.entende_prospeccao ? "Sim" : "Não",
    c.facilidade_equipe ? "Sim" : "Não",
    c.disponibilidade_integral ? "Sim" : "Não",
    c.disponibilidade_finais_semana ? "Sim" : "Não",
    c.conhece_consorcios ? "Sim" : "Não",
    c.conhece_ademicon ? "Sim" : "Não",
    c.por_onde_conheceu,
    c.observacoes,
  ]);
  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  return csv;
}

export async function exportRecrutamentoXLSX(candidatos: RecrutamentoCandidato[]): Promise<string> {
  const XLSX = await import("xlsx");
  const rows = candidatos.map((c) => ({
    Nome: c.nome,
    Email: c.email,
    Telefone: c.telefone,
    Origem: c.origem,
    Status: c.status,
    Tipo: c.tipo,
    Gênero: c.genero,
    Idade: c.idade,
    CPF: c.cpf,
    RG: c.rg,
    Endereço: c.endereco,
    Cidade: c.cidade,
    Equipe: c.equipe,
    "Veio por": c.veio_por,
    Indicação: c.indicacao ? "Sim" : "Não",
    Catho: c.catho ? "Sim" : "Não",
    Instagram: c.instagram ? "Sim" : "Não",
    LinkedIn: c.linkedin,
    Telegram: c.telegram,
    Outros: c.outros,
    "Trabalhou com vendas": c.trabalhou_vendas ? "Sim" : "Não",
    "Trabalhou comissionado": c.trabalhou_comissionado ? "Sim" : "Não",
    CLT: c.clt ? "Sim" : "Não",
    "Conhecimento Office": c.conhecimento_office ? "Sim" : "Não",
    "Entende prospecção": c.entende_prospeccao ? "Sim" : "Não",
    "Facilidade equipe": c.facilidade_equipe ? "Sim" : "Não",
    "Disponibilidade integral": c.disponibilidade_integral ? "Sim" : "Não",
    "Disponibilidade finais de semana": c.disponibilidade_finais_semana ? "Sim" : "Não",
    "Conhece consórcios": c.conhece_consorcios ? "Sim" : "Não",
    "Conhece Ademicon": c.conhece_ademicon ? "Sim" : "Não",
    "Por onde conheceu": c.por_onde_conheceu,
    Observações: c.observacoes,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Recrutamento");
  return XLSX.write(wb, { type: "base64", bookType: "xlsx" });
}

export async function exportRecrutamentoPDF(candidatos: RecrutamentoCandidato[]): Promise<string> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Recrutamento", 14, 16);
  doc.setFontSize(10);
  let y = 26;
  const pageHeight = doc.internal.pageSize.height || 297;
  const margin = 14;
  const maxWidth = doc.internal.pageSize.width ? doc.internal.pageSize.width - margin * 2 : 180;

  for (let i = 0; i < candidatos.length; i++) {
    const c = candidatos[i];
    const lines = [
      `${i + 1}. ${c.nome}`,
      `Email: ${c.email} | Telefone: ${c.telefone} | Status: ${c.status}`,
      `Tipo: ${c.tipo} | Gênero: ${c.genero} | Idade: ${c.idade ?? ""}`,
      `CPF: ${c.cpf} | RG: ${c.rg}`,
      `Endereço: ${c.endereco} | Cidade: ${c.cidade} | Equipe: ${c.equipe}`,
      `Origem: ${c.origem} | Veio por: ${c.veio_por}`,
      `LinkedIn: ${c.linkedin} | Telegram: ${c.telegram}`,
      `Observações: ${c.observacoes}`,
    ];

    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += 7;
    }
    y += 4;
  }

  return doc.output("dataurlstring");
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseRecrutamentoCSV(text: string): RecrutamentoCandidato[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const startIndex = lines[0].toLowerCase().includes("nome") ? 1 : 0;
  const candidatos: RecrutamentoCandidato[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(separator).map((v) => v.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
    if (values.length >= 2) {
      candidatos.push({
        nome: values[0] || "",
        email: values[1] || "",
        telefone: values[2] || "",
        origem: values[3] || "",
        status: values[4] || "Novo",
        tipo: values[5] || "convite",
        genero: values[6] || "",
        idade: values[7] ? Number(values[7]) : null,
        cpf: values[8] || "",
        rg: values[9] || "",
        endereco: values[10] || "",
        cidade: values[11] || "",
        equipe: values[12] || "",
        veio_por: values[13] || "",
        indicacao: values[14]?.toLowerCase() === "sim",
        catho: values[15]?.toLowerCase() === "sim",
        instagram: values[16]?.toLowerCase() === "sim",
        linkedin: values[17] || "",
        telegram: values[18] || "",
        outros: values[19] || "",
        trabalhou_vendas: values[20]?.toLowerCase() === "sim",
        trabalhou_comissionado: values[21]?.toLowerCase() === "sim",
        clt: values[22]?.toLowerCase() === "sim",
        conhecimento_office: values[23]?.toLowerCase() === "sim",
        entende_prospeccao: values[24]?.toLowerCase() === "sim",
        facilidade_equipe: values[25]?.toLowerCase() === "sim",
        disponibilidade_integral: values[26]?.toLowerCase() === "sim",
        disponibilidade_finais_semana: values[27]?.toLowerCase() === "sim",
        conhece_consorcios: values[28]?.toLowerCase() === "sim",
        conhece_ademicon: values[29]?.toLowerCase() === "sim",
        por_onde_conheceu: values[30] || "",
        observacoes: values[31] || "",
      });
    }
  }
  return candidatos;
}

export async function parseRecrutamentoXLSX(buffer: ArrayBuffer): Promise<RecrutamentoCandidato[]> {
  try {
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" }) as Record<string, unknown>[];
    const candidatos: RecrutamentoCandidato[] = [];
    for (const row of rows) {
      const idadeRaw = row.Idade ?? row.idade ?? "";
      const idadeNumber = idadeRaw === "" || idadeRaw == null ? null : Number(idadeRaw);
      candidatos.push({
        nome: String(row.Nome || row.nome || "").trim(),
        email: String(row.Email || row.email || "").trim(),
        telefone: String(row.Telefone || row.telefone || "").trim(),
        origem: String(row.Origem || row.origem || "").trim(),
        status: String(row.Status || row.status || "Novo").trim(),
        tipo: String(row.Tipo || row.tipo || "convite").trim(),
        genero: String(row.Gênero || row.genero || "").trim(),
        idade: Number.isNaN(idadeNumber) ? null : idadeNumber,
        cpf: String(row.CPF || row.cpf || "").trim(),
        rg: String(row.RG || row.rg || "").trim(),
        endereco: String(row["Endereço"] || row.endereco || "").trim(),
        cidade: String(row.Cidade || row.cidade || "").trim(),
        equipe: String(row.Equipe || row.equipe || "").trim(),
        veio_por: String(row["Veio por"] || row.veio_por || "").trim(),
        indicacao: String(row.Indicação || row.indicacao || "").toLowerCase() === "sim",
        catho: String(row.Catho || row.catho || "").toLowerCase() === "sim",
        instagram: String(row.Instagram || row.instagram || "").toLowerCase() === "sim",
        linkedin: String(row.LinkedIn || row.linkedin || "").trim(),
        telegram: String(row.Telegram || row.telegram || "").trim(),
        outros: String(row.Outros || row.outros || "").trim(),
        trabalhou_vendas: String(row["Trabalhou com vendas"] || row.trabalhou_vendas || "").toLowerCase() === "sim",
        trabalhou_comissionado: String(row["Trabalhou comissionado"] || row.trabalhou_comissionado || "").toLowerCase() === "sim",
        clt: String(row.CLT || row.clt || "").toLowerCase() === "sim",
        conhecimento_office: String(row["Conhecimento Office"] || row.conhecimento_office || "").toLowerCase() === "sim",
        entende_prospeccao: String(row["Entende prospecção"] || row.entende_prospeccao || "").toLowerCase() === "sim",
        facilidade_equipe: String(row["Facilidade equipe"] || row.facilidade_equipe || "").toLowerCase() === "sim",
        disponibilidade_integral: String(row["Disponibilidade integral"] || row.disponibilidade_integral || "").toLowerCase() === "sim",
        disponibilidade_finais_semana: String(row["Disponibilidade finais de semana"] || row.disponibilidade_finais_semana || "").toLowerCase() === "sim",
        conhece_consorcios: String(row["Conhece consórcios"] || row.conhece_consorcios || "").toLowerCase() === "sim",
        conhece_ademicon: String(row["Conhece Ademicon"] || row.conhece_ademicon || "").toLowerCase() === "sim",
        por_onde_conheceu: String(row["Por onde conheceu"] || row.por_onde_conheceu || "").trim(),
        observacoes: String(row.Observações || row.observacoes || "").trim(),
      });
    }
    return candidatos;
  } catch {
    return [];
  }
}
