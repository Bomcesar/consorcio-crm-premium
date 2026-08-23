export type Contato = {
  nome: string;
  telefone: string;
  email?: string;
  observacao?: string;
};

export type ContatoImportPreview = Contato & {
  status: "Novo" | "Já cadastrado" | "Possível duplicado";
};

export function exportCSV(contatos: Contato[]): string {
  const header = "nome,telefone,email,observacao\n";
  const rows = contatos
    .map((c) => {
      const escape = (value: string) => {
        if (value.includes(",") || value.includes('"') || value.includes("\n")) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      };
      return [escape(c.nome), escape(c.telefone), escape(c.email || ""), escape(c.observacao || "")].join(",");
    })
    .join("\n");
  return header + rows;
}

export function exportVCF(contatos: Contato[]): string {
  const cards = contatos
    .map((c) => {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${c.nome}`,
        `N:;;;;`,
        `TEL;TYPE=CELL:${c.telefone}`,
      ];
      if (c.email) {
        lines.push(`EMAIL;TYPE=INTERNET:${c.email}`);
      }
      if (c.observacao) {
        lines.push(`NOTE:${c.observacao}`);
      }
      lines.push("END:VCARD");
      return lines.join("\n");
    })
    .join("\n");
  return cards;
}

export function exportTXT(contatos: Contato[]): string {
  return contatos
    .map((c) => {
      return [
        `Nome: ${c.nome}`,
        `Telefone: ${c.telefone}`,
        `E-mail: ${c.email}`,
        c.observacao ? `Observação: ${c.observacao}` : "",
        "",
      ].join("\n");
    })
    .join("\n");
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

export function parseCSV(text: string): Contato[] {
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length === 0) return [];
  const separator = lines[0].includes(";") ? ";" : ",";
  const startIndex = lines[0].toLowerCase().includes("nome") ? 1 : 0;
  const contatos: Contato[] = [];
  for (let i = startIndex; i < lines.length; i++) {
    const line = lines[i];
    const values = line.split(separator).map((v) => v.trim().replace(/^"|"$/g, "").replace(/""/g, '"'));
    if (values.length >= 3) {
      contatos.push({
        nome: values[0] || "",
        telefone: values[1] || "",
        email: values[2] || "",
        observacao: values[3] || "",
      });
    }
  }
  return contatos;
}

export function parseVCF(text: string): Contato[] {
  const cards = text.split("BEGIN:VCARD").slice(1);
  const contatos: Contato[] = [];
  for (const card of cards) {
    const lines = card.split(/\r?\n/);
    let nome = "";
    let telefone = "";
    let email = "";
    let observacao = "";
    for (const line of lines) {
      if (line.startsWith("FN:")) nome = line.slice(3).trim();
      else if (line.startsWith("TEL")) telefone = line.split(":").slice(1).join(":").trim();
      else if (line.startsWith("EMAIL")) email = line.split(":").slice(1).join(":").trim();
      else if (line.startsWith("NOTE")) observacao = line.slice(5).trim();
    }
    if (nome || telefone || email) {
      contatos.push({ nome, telefone, email, observacao });
    }
  }
  return contatos;
}

export function parseTXT(text: string): Contato[] {
  const blocks = text.split(/\n\s*\n/);
  const contatos: Contato[] = [];
  for (const block of blocks) {
    const lines = block.split(/\r?\n/).filter((line) => line.trim() !== "");
    let nome = "";
    let telefone = "";
    let email = "";
    let observacao = "";
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (lower.startsWith("nome:")) nome = line.slice(5).trim();
      else if (lower.startsWith("telefone:")) telefone = line.slice(9).trim();
      else if (lower.startsWith("e-mail:") || lower.startsWith("email:")) email = line.split(":").slice(1).join(":").trim();
      else if (lower.startsWith("observação:") || lower.startsWith("observacao:")) observacao = line.split(":").slice(1).join(":").trim();
      else if (!nome && line.trim()) nome = line.trim();
    }
    if (nome || telefone || email) {
      contatos.push({ nome, telefone, email, observacao });
    }
  }
  return contatos;
}

export function detectDuplicates(contatos: Contato[], existing: Contato[]): ContatoImportPreview[] {
  const existingPhones = new Set(existing.map((c) => c.telefone.replace(/\D/g, "")));
  const existingEmails = new Set(existing.map((c) => (c.email || "").toLowerCase()).filter(Boolean));
  const existingNamePhone = new Set(existing.map((c) => `${c.nome.toLowerCase()}|${c.telefone.replace(/\D/g, "")}`));

  return contatos.map((c) => {
    const phoneDigits = c.telefone.replace(/\D/g, "");
    const emailLower = (c.email || "").toLowerCase();
    const namePhone = `${c.nome.toLowerCase()}|${phoneDigits}`;

    if (existingPhones.has(phoneDigits) || (emailLower && existingEmails.has(emailLower))) {
      return { ...c, status: "Já cadastrado" };
    }
    if (existingNamePhone.has(namePhone)) {
      return { ...c, status: "Possível duplicado" };
    }
    return { ...c, status: "Novo" };
  });
}
