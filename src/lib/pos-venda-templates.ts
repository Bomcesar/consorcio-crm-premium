export type MessageTemplate = {
  key: string;
  label: string;
  body: string;
};

export const POS_VENDA_TEMPLATES: MessageTemplate[] = [
  {
    key: "boas_vindas",
    label: "Boas-vindas",
    body: "Olá {nome}! Seja muito bem-vindo(a) ao grupo {grupo}. Estamos à disposição para qualquer dúvida.",
  },
  {
    key: "vencimento_boleto",
    label: "Vencimento do boleto",
    body: "Olá {nome}! Lembrete: seu boleto vence em {vencimento}. Evite atrasos e mantenha seu consórcio em dia.",
  },
  {
    key: "assembleia",
    label: "Assembleia",
    body: "Olá {nome}! A assembleia do grupo {grupo} está confirmada para {data_assembleia}. Contamos com sua presença!",
  },
];

export const renderTemplate = (template: MessageTemplate, values: Record<string, string>) => {
  return template.body.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
};
