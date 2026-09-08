export type MessageTemplate = {
  key: string;
  label: string;
  body: string;
  category?: "cliente" | "grupo" | "checklist";
};

export const POS_VENDA_TEMPLATES: MessageTemplate[] = [
  {
    key: "boas_vindas",
    label: "Boas-vindas",
    category: "cliente",
    body: `Olá @⁨{nome}⁩
Seja bem vindo a Ademicon.
Neste grupo enviaremos documentos para ficar anexado.

E também será um canal de comunicação com o nosso time. 

Qualquer dúvida pode mandar aqui no grupo!
Estamos à disposição 🅰️


Esse é o link do aplicativo.
Coloque redefinir a senha para conseguir fazer login
IOS
https://apps.apple.com/app/id1569223984
ANDROID
https://play.google.com/store/apps/details?id=com.ademicon.app_cliente&pcampaignid=web_share
➡️MENSAGEM FINAL
Através deste link ⬆️ você pode acessar todas as informações referentes ao seu consórcio!

Obrigado por confiar no time Ademicon`,
  },
  {
    key: "comprovante_pix",
    label: "Comprovante PIX",
    category: "grupo",
    body: `Data: {data_pagamento}
Consultor: Paulo Cesar
Cliente : {nome_cliente}
Valor: {valor}
Grupo: {grupo}
Cota: {cota}
Matricula : Paulo Cesar`,
  },
  {
    key: "lista_atualizada",
    label: "Lista atualizada",
    category: "grupo",
    body: `ASSIM QUE SEU CLIENTE PAGAR POR FAVOR COLOQUE SEU NOME E UM ✅ AQUI!🤝 SE CADA UM FAZER A SUA PARTE NÃO FICA PESADO PRA NINGUÉM!`,
  },
  {
    key: "modalidade_lar",
    label: "Modalidade LAR",
    category: "grupo",
    body: `🏠 Modalidade LAR

Esse mês será o melhor mês para todos em nome de Jesus!

💥 💥💥💥💥💥💥💥💥💥💥

Parabéns {nome_consultor} por realizar o sonho de mais um cliente {valor_carta}🚀💣💥🏆

A nossa equipe vai realizar sonhos TODOS os dias em NOME DE JESUS.

"Consagre ao Senhor tudo o que você faz, e os seus planos serão bem sucedidos.''
Provérbios 16:3

Pra cimaaa 💥🚀

👇`,
  },
  {
    key: "ranking_mensal",
    label: "Ranking Mensal",
    category: "grupo",
    body: `🚀 RANKING {mes}
TIME – ÊNIO & GIDI 🚜

Nossa meta para {mes} é GERAR R$ {meta_milhoes} MILHÕES em vendas, o que representa R$ {meta_comissao} MIL em comissão.

👉 Pense no valor que você deseja receber por mês e foque nas cotas de Crédito.
Cada cota vendida, você aumenta em média 100 reais do seu ganho a partir do próximo mês.

Estamos juntos nessa jornada!
Rumo aos R$ {meta_milhoes} MILHÕES! 🤝

✅ Progresso: R$ {progresso}`,
  },
  {
    key: "pos_venda_boas_vindas",
    label: "Pós-venda: Boas-vindas",
    category: "checklist",
    body: `CLIENTE NOME: {nome}
CONSULTOR: Paulo Cesar
SECRETÁRIA: 
ADMINISTRATIVA: 

Olá @⁨{nome}⁩
Seja bem vindo a Ademicon.
Neste grupo enviaremos documentos para ficar anexado.

E também será um canal de comunicação com o nosso time. 

Qualquer dúvida pode mandar aqui no grupo!
Estamos à disposição 🅰️`,
  },
  {
    key: "pos_venda_comprovante",
    label: "Pós-venda: Comprovante",
    category: "checklist",
    body: `CLIENTE NOME: {nome}
CONSULTOR: Paulo Cesar
SECRETÁRIA: 
ADMINISTRATIVA: 

📄 Comprovante de pagamento enviado com sucesso.

Data: {data_pagamento}
Valor: {valor}
Grupo: {grupo}
Cota: {cota}`,
  },
  {
    key: "pos_venda_regulamento",
    label: "Pós-venda: Regulamento",
    category: "checklist",
    body: `CLIENTE NOME: {nome}
CONSULTOR: Paulo Cesar
SECRETÁRIA: 
ADMINISTRATIVA: 

📋 Regulamento do grupo enviado. Por favor, leia atentamente.`,
  },
  {
    key: "pos_venda_contrato",
    label: "Pós-venda: Contrato",
    category: "checklist",
    body: `CLIENTE NOME: {nome}
CONSULTOR: Paulo Cesar
SECRETÁRIA: 
ADMINISTRATIVA: 

📄 Contrato enviado. Por favor, revise e confirme o recebimento.`,
  },
  {
    key: "pos_venda_app",
    label: "Pós-venda: App Ademicon",
    category: "checklist",
    body: `CLIENTE NOME: {nome}
CONSULTOR: Paulo Cesar
SECRETÁRIA: 
ADMINISTRATIVA: 

📱 Acesse o aplicativo Ademicon:

IOS: https://apps.apple.com/app/id1569223984
ANDROID: https://play.google.com/store/apps/details?id=com.ademicon.app_cliente&pcampaignid=web_share

Coloque redefinir a senha para conseguir fazer login.

Através deste link você pode acessar todas as informações referentes ao seu consórcio!

Obrigado por confiar no time Ademicon`,
  },
];

export const renderTemplate = (template: MessageTemplate, values: Record<string, string>) => {
  return template.body.replace(/\{(\w+)\}/g, (_, key) => values[key] || `{${key}}`);
};
