export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Perfil = "Administrador" | "Gestor" | "Consultor" | "Trainee" | "Secretaria" | "Indicador";

export type StatusLead = "Novo" | "Em contato" | "Qualificado" | "Em análise" | "Proposta" | "Ganho" | "Perdido";
export type StatusIndicador = "Ativo" | "Inativo" | "Pendente";
export type StatusCliente = "Ativo" | "Inativo" | "Bloqueado";
export type StatusAgenda = "Agendado" | "Confirmado" | "Realizado" | "Cancelado";
export type TipoAgenda = "Reunião" | "Visita" | "Ligação" | "Assembleia" | "Contemplação" | "Treinamento";
export type TipoMensagemWhatsApp = "texto" | "imagem" | "audio" | "documento";
export type StatusMensagemWhatsApp = "pendente" | "enviada" | "entregue" | "lida" | "erro";
export type EtapaNegociacao = "Prospecção" | "Qualificação" | "Proposta" | "Negociação" | "Fechamento" | "Venda" | "Perdido";
export type TipoPosVenda = "Follow-up" | "Assembleia" | "Contemplação" | "Retenção" | "Treinamento" | "Envio de boleto" | "Lembrete de vencimento" | "Acompanhamento";
export type StatusPosVenda = "Pendente" | "Agendado" | "Realizado" | "Cancelado";
export type StatusTarefaPosVenda = "Pendente" | "Concluída" | "Cancelada";
export type StatusCobranca = "Pendente" | "Enviado" | "Pago" | "Atrasado" | "Renegociação" | "Cancelado";
export type TipoComunicacao = "WhatsApp" | "Ligação";
export type StatusComunicacao = "Pendente" | "Enviado" | "Entregue" | "Lido" | "Respondido" | "Erro";
export type StatusComissao = "Prevista" | "Pendente" | "Paga" | "A receber";
export type TipoComissao = "Venda" | "Indicacao" | "Outro";
export type StatusAssembleia = "Pendente" | "Realizada" | "Cancelada";
export type TipoAvisoAssembleia = "aviso" | "lembrete" | "envio";
export type StatusLance = "Enviado" | "Aguardando" | "Vencedor" | "Não vencedor";
export type TipoContemplacao = "Lance" | "Sorteio";
export type TipoMaterialConsultor = "PDF" | "Imagem" | "Vídeo" | "Áudio" | "Documento" | "Texto";
export type StatusMaterialConsultor = "Ativo" | "Inativo";
export type StatusTreinamento = "Ativo" | "Inativo";
export type StatusLinkUtil = "Ativo" | "Inativo";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          email: string;
          perfil: Perfil;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
          ativo: boolean;
          ultimo_login: string | null;
        };
        Insert: {
          id?: string;
          nome?: string;
          email?: string;
          perfil?: Perfil;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          ativo?: boolean;
          ultimo_login?: string | null;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          perfil?: Perfil;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
          ativo?: boolean;
          ultimo_login?: string | null;
        };
      };
      leads: {
        Row: {
          id: string;
          nome: string;
          telefone: string;
          cidade: string;
          status: StatusLead;
          observacoes: string;
          origem: string;
          email: string;
          valor_estimado: number;
          probabilidade: number;
          ultimo_contato: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome?: string;
          telefone?: string;
          cidade?: string;
          status?: StatusLead;
          observacoes?: string;
          origem?: string;
          email?: string;
          valor_estimado?: number;
          probabilidade?: number;
          ultimo_contato?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          telefone?: string;
          cidade?: string;
          status?: StatusLead;
          observacoes?: string;
          origem?: string;
          email?: string;
          valor_estimado?: number;
          probabilidade?: number;
          ultimo_contato?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      lead_historico: {
        Row: {
          id: string;
          lead_id: string;
          tipo: string;
          descricao: string;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string | null;
          created_at?: string;
        };
      };
      lead_anexos: {
        Row: {
          id: string;
          lead_id: string;
          nome: string;
          url: string;
          tipo: string;
          tamanho: number;
          usuario_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          lead_id?: string;
          nome?: string;
          url?: string;
          tipo?: string;
          tamanho?: number;
          usuario_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          lead_id?: string;
          nome?: string;
          url?: string;
          tipo?: string;
          tamanho?: number;
          usuario_id?: string | null;
          created_at?: string;
        };
      };
      indicador_historico: {
        Row: {
          id: string;
          indicador_id: string;
          tipo: string;
          descricao: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          indicador_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          indicador_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
      };
      indicadores: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          nome: string;
          telefone: string;
          email: string;
          cidade: string;
          estado: string;
          cpf: string;
          pix: string;
          origem: string;
          status: StatusIndicador;
          observacoes: string;
          ativo: boolean;
          usuario_id: string;
          grupo_whatsapp: boolean;
          link_grupo: string;
          grupo_criado: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          nome?: string;
          telefone?: string;
          email?: string;
          cidade?: string;
          estado?: string;
          cpf?: string;
          pix?: string;
          origem?: string;
          status?: StatusIndicador;
          observacoes?: string;
          ativo?: boolean;
          usuario_id?: string;
          grupo_whatsapp?: boolean;
          link_grupo?: string;
          grupo_criado?: boolean;
        };
        Update: {
          id?: string;
          created_at?: string;
          updated_at?: string;
          nome?: string;
          telefone?: string;
          email?: string;
          cidade?: string;
          estado?: string;
          cpf?: string;
          pix?: string;
          origem?: string;
          status?: StatusIndicador;
          observacoes?: string;
          ativo?: boolean;
          usuario_id?: string;
          grupo_whatsapp?: boolean;
          link_grupo?: string;
          grupo_criado?: boolean;
        };
      };
      contatos_indicados: {
        Row: {
          id: string;
          indicador_id: string;
          nome: string;
          telefone: string;
          cidade: string;
          status: string;
          observacoes: string;
          created_at: string;
          updated_at: string;
          usuario_id: string;
        };
        Insert: {
          id?: string;
          indicador_id?: string;
          nome?: string;
          telefone?: string;
          cidade?: string;
          status?: string;
          observacoes?: string;
          created_at?: string;
          updated_at?: string;
          usuario_id?: string;
        };
        Update: {
          id?: string;
          indicador_id?: string;
          nome?: string;
          telefone?: string;
          cidade?: string;
          status?: string;
          observacoes?: string;
          created_at?: string;
          updated_at?: string;
          usuario_id?: string;
        };
      };
      comissoes_indicadores: {
        Row: {
          id: string;
          indicador_id: string;
          valor: number;
          status: StatusComissao;
          pix: string;
          data_pagamento: string | null;
          observacoes: string;
          cliente_id: string | null;
          negociacao_id: string | null;
          data_prevista: string | null;
          tipo: TipoComissao;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          indicador_id?: string;
          valor?: number;
          status?: StatusComissao;
          pix?: string;
          data_pagamento?: string | null;
          observacoes?: string;
          cliente_id?: string | null;
          negociacao_id?: string | null;
          data_prevista?: string | null;
          tipo?: TipoComissao;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          indicador_id?: string;
          valor?: number;
          status?: StatusComissao;
          pix?: string;
          data_pagamento?: string | null;
          observacoes?: string;
          cliente_id?: string | null;
          negociacao_id?: string | null;
          data_prevista?: string | null;
          tipo?: TipoComissao;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      clientes: {
        Row: {
          id: string;
          nome: string;
          email: string;
          telefone: string;
          cpf_cnpj: string;
          cidade: string;
          estado: string;
          status: StatusCliente;
          origem: string;
          observacoes: string;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome?: string;
          email?: string;
          telefone?: string;
          cpf_cnpj?: string;
          cidade?: string;
          estado?: string;
          status?: StatusCliente;
          origem?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          telefone?: string;
          cpf_cnpj?: string;
          cidade?: string;
          estado?: string;
          status?: StatusCliente;
          origem?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      cliente_historico: {
        Row: {
          id: string;
          cliente_id: string;
          tipo: string;
          descricao: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cliente_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
      };
      cliente_contatos: {
        Row: {
          id: string;
          cliente_id: string;
          nome: string;
          telefone: string;
          email: string;
          tipo: string;
          observacoes: string;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id?: string;
          nome?: string;
          telefone?: string;
          email?: string;
          tipo?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string;
          nome?: string;
          telefone?: string;
          email?: string;
          tipo?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_eventos: {
        Row: {
          id: string;
          titulo: string;
          descricao: string;
          data_inicio: string;
          data_fim: string;
          local: string;
          tipo: TipoAgenda;
          status: StatusAgenda;
          lead_id: string | null;
          cliente_id: string | null;
          indicador_id: string | null;
          negociacao_id: string | null;
          pos_venda_id: string | null;
          proxima_acao: string;
          data_proxima_acao: string | null;
          lembrete_em: string | null;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo?: string;
          descricao?: string;
          data_inicio?: string;
          data_fim?: string;
          local?: string;
          tipo?: TipoAgenda;
          status?: StatusAgenda;
          lead_id?: string | null;
          cliente_id?: string | null;
          indicador_id?: string | null;
          negociacao_id?: string | null;
          pos_venda_id?: string | null;
          proxima_acao?: string;
          data_proxima_acao?: string | null;
          lembrete_em?: string | null;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string;
          data_inicio?: string;
          data_fim?: string;
          local?: string;
          tipo?: TipoAgenda;
          status?: StatusAgenda;
          lead_id?: string | null;
          cliente_id?: string | null;
          indicador_id?: string | null;
          negociacao_id?: string | null;
          pos_venda_id?: string | null;
          proxima_acao?: string;
          data_proxima_acao?: string | null;
          lembrete_em?: string | null;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_tarefas: {
        Row: {
          id: string;
          titulo: string;
          descricao: string;
          data_inicio: string;
          data_fim: string;
          local: string;
          tipo: string;
          status: string;
          lead_id: string | null;
          cliente_id: string | null;
          indicador_id: string | null;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo?: string;
          descricao?: string;
          data_inicio?: string;
          data_fim?: string;
          local?: string;
          tipo?: string;
          status?: string;
          lead_id?: string | null;
          cliente_id?: string | null;
          indicador_id?: string | null;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string;
          data_inicio?: string;
          data_fim?: string;
          local?: string;
          tipo?: string;
          status?: string;
          lead_id?: string | null;
          cliente_id?: string | null;
          indicador_id?: string | null;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      agenda_followups: {
        Row: {
          id: string;
          evento_id: string;
          titulo: string;
          descricao: string;
          data_prevista: string;
          data_realizada: string | null;
          status: string;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          evento_id?: string;
          titulo?: string;
          descricao?: string;
          data_prevista?: string;
          data_realizada?: string | null;
          status?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          evento_id?: string;
          titulo?: string;
          descricao?: string;
          data_prevista?: string;
          data_realizada?: string | null;
          status?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      whatsapp_mensagens: {
        Row: {
          id: string;
          telefone: string;
          mensagem: string;
          tipo: TipoMensagemWhatsApp;
          status: StatusMensagemWhatsApp;
          lead_id: string | null;
          cliente_id: string | null;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          telefone?: string;
          mensagem?: string;
          tipo?: TipoMensagemWhatsApp;
          status?: StatusMensagemWhatsApp;
          lead_id?: string | null;
          cliente_id?: string | null;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          telefone?: string;
          mensagem?: string;
          tipo?: TipoMensagemWhatsApp;
          status?: StatusMensagemWhatsApp;
          lead_id?: string | null;
          cliente_id?: string | null;
          usuario_id?: string;
          created_at?: string;
        };
      };
      negociacoes: {
        Row: {
          id: string;
          titulo: string;
          valor: number;
          etapa: EtapaNegociacao;
          probabilidade: number;
          data_prevista: string;
          observacoes: string;
          lead_id: string;
          cliente_id: string | null;
          usuario_id: string;
          modalidade: string;
          proposta: string;
          proxima_acao: string;
          data_proxima_acao: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo?: string;
          valor?: number;
          etapa?: EtapaNegociacao;
          probabilidade?: number;
          data_prevista?: string;
          observacoes?: string;
          lead_id?: string;
          cliente_id?: string | null;
          usuario_id?: string;
          modalidade?: string;
          proposta?: string;
          proxima_acao?: string;
          data_proxima_acao?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          valor?: number;
          etapa?: EtapaNegociacao;
          probabilidade?: number;
          data_prevista?: string;
          observacoes?: string;
          lead_id?: string;
          cliente_id?: string | null;
          usuario_id?: string;
          modalidade?: string;
          proposta?: string;
          proxima_acao?: string;
          data_proxima_acao?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      negociacao_historico: {
        Row: {
          id: string;
          negociacao_id: string;
          tipo: string;
          descricao: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          negociacao_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          negociacao_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
      };
      negociacao_anexos: {
        Row: {
          id: string;
          negociacao_id: string;
          nome: string;
          url: string;
          tipo: string;
          tamanho: number;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          negociacao_id?: string;
          nome?: string;
          url?: string;
          tipo?: string;
          tamanho?: number;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          negociacao_id?: string;
          nome?: string;
          url?: string;
          tipo?: string;
          tamanho?: number;
          usuario_id?: string;
          created_at?: string;
        };
      };
      pos_venda: {
        Row: {
          id: string;
          tipo: TipoPosVenda;
          descricao: string;
          data_prevista: string;
          data_realizada: string | null;
          status: StatusPosVenda;
          cliente_id: string | null;
          lead_id: string | null;
          usuario_id: string;
          boleto_url: string;
          lembrete_em: string | null;
          retencao_motivo: string;
          retencao_data: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tipo?: TipoPosVenda;
          descricao?: string;
          data_prevista?: string;
          data_realizada?: string | null;
          status?: StatusPosVenda;
          cliente_id?: string | null;
          lead_id?: string | null;
          usuario_id?: string;
          boleto_url?: string;
          lembrete_em?: string | null;
          retencao_motivo?: string;
          retencao_data?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tipo?: TipoPosVenda;
          descricao?: string;
          data_prevista?: string;
          data_realizada?: string | null;
          status?: StatusPosVenda;
          cliente_id?: string | null;
          lead_id?: string | null;
          usuario_id?: string;
          boleto_url?: string;
          lembrete_em?: string | null;
          retencao_motivo?: string;
          retencao_data?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      pos_venda_historico: {
        Row: {
          id: string;
          pos_venda_id: string;
          tipo: string;
          descricao: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pos_venda_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pos_venda_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
      };
      pos_venda_tarefas: {
        Row: {
          id: string;
          pos_venda_id: string;
          titulo: string;
          descricao: string;
          data_prevista: string;
          data_realizada: string | null;
          status: StatusTarefaPosVenda;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          pos_venda_id?: string;
          titulo?: string;
          descricao?: string;
          data_prevista?: string;
          data_realizada?: string | null;
          status?: StatusTarefaPosVenda;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          pos_venda_id?: string;
          titulo?: string;
          descricao?: string;
          data_prevista?: string;
          data_realizada?: string | null;
          status?: StatusTarefaPosVenda;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      pos_venda_comunicacoes: {
        Row: {
          id: string;
          pos_venda_id: string;
          tipo: TipoComunicacao;
          descricao: string;
          resultado: string;
          data: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          pos_venda_id?: string;
          tipo?: TipoComunicacao;
          descricao?: string;
          resultado?: string;
          data?: string;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          pos_venda_id?: string;
          tipo?: TipoComunicacao;
          descricao?: string;
          resultado?: string;
          data?: string;
          usuario_id?: string;
          created_at?: string;
        };
      };
      cobrancas: {
        Row: {
          id: string;
          valor: number;
          valor_pago: number;
          metodo_pagamento: string;
          data_vencimento: string;
          data_pagamento: string | null;
          status: StatusCobranca;
          cliente_id: string | null;
          usuario_id: string;
          observacoes: string;
          numero_parcela: number;
          total_parcelas: number;
          boleto_url: string;
          lembrete_em: string | null;
          cliente_origem_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          valor?: number;
          valor_pago?: number;
          metodo_pagamento?: string;
          data_vencimento?: string;
          data_pagamento?: string | null;
          status?: StatusCobranca;
          cliente_id?: string | null;
          usuario_id?: string;
          observacoes?: string;
          numero_parcela?: number;
          total_parcelas?: number;
          boleto_url?: string;
          lembrete_em?: string | null;
          cliente_origem_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          valor?: number;
          valor_pago?: number;
          metodo_pagamento?: string;
          data_vencimento?: string;
          data_pagamento?: string | null;
          status?: StatusCobranca;
          cliente_id?: string | null;
          usuario_id?: string;
          observacoes?: string;
          numero_parcela?: number;
          total_parcelas?: number;
          boleto_url?: string;
          lembrete_em?: string | null;
          cliente_origem_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      cobranca_historico: {
        Row: {
          id: string;
          cobranca_id: string;
          tipo: string;
          descricao: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          cobranca_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          cobranca_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
      };
      comunicacoes: {
        Row: {
          id: string;
          tipo: TipoComunicacao;
          contato: string;
          observacao: string;
          resultado: string;
          data: string;
          horario: string;
          lead_id: string | null;
          cliente_id: string | null;
          indicador_id: string | null;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tipo?: TipoComunicacao;
          contato?: string;
          observacao?: string;
          resultado?: string;
          data?: string;
          horario?: string;
          lead_id?: string | null;
          cliente_id?: string | null;
          indicador_id?: string | null;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tipo?: TipoComunicacao;
          contato?: string;
          observacao?: string;
          resultado?: string;
          data?: string;
          horario?: string;
          lead_id?: string | null;
          cliente_id?: string | null;
          indicador_id?: string | null;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      comunicacao_templates: {
        Row: {
          id: string;
          titulo: string;
          conteudo: string;
          tipo: string;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo?: string;
          conteudo?: string;
          tipo?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          conteudo?: string;
          tipo?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      anexos: {
        Row: {
          id: string;
          entity_type: string;
          entity_id: string;
          nome: string;
          caminho: string;
          tipo: string;
          tamanho: number;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          nome?: string;
          caminho?: string;
          tipo?: string;
          tamanho?: number;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          entity_type?: string;
          entity_id?: string;
          nome?: string;
          caminho?: string;
          tipo?: string;
          tamanho?: number;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      assembleias: {
        Row: {
          id: string;
          cliente_id: string | null;
          grupo: string;
          cota: number;
          data: string;
          numero_assembleia: number;
          situacao: StatusAssembleia;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id?: string | null;
          grupo?: string;
          cota?: number;
          data?: string;
          numero_assembleia?: number;
          situacao?: StatusAssembleia;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string | null;
          grupo?: string;
          cota?: number;
          data?: string;
          numero_assembleia?: number;
          situacao?: StatusAssembleia;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      assembleia_avisos: {
        Row: {
          id: string;
          assembleia_id: string;
          tipo: TipoAvisoAssembleia;
          descricao: string;
          data_envio: string | null;
          enviado: boolean;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assembleia_id?: string;
          tipo?: TipoAvisoAssembleia;
          descricao?: string;
          data_envio?: string | null;
          enviado?: boolean;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          assembleia_id?: string;
          tipo?: TipoAvisoAssembleia;
          descricao?: string;
          data_envio?: string | null;
          enviado?: boolean;
          usuario_id?: string;
          created_at?: string;
        };
      };
      assembleia_historico: {
        Row: {
          id: string;
          assembleia_id: string;
          tipo: string;
          descricao: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          assembleia_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          assembleia_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
      };
      loteria_federal: {
        Row: {
          id: string;
          numero_extracao: number;
          data: string;
          resultado: string;
          grupo: string;
          cota: number;
          cliente_id: string | null;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          numero_extracao?: number;
          data?: string;
          resultado?: string;
          grupo?: string;
          cota?: number;
          cliente_id?: string | null;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          numero_extracao?: number;
          data?: string;
          resultado?: string;
          grupo?: string;
          cota?: number;
          cliente_id?: string | null;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      lances: {
        Row: {
          id: string;
          valor: number;
          percentual: number;
          data: string;
          assembleia_id: string | null;
          grupo: string;
          cota: number;
          cliente_id: string | null;
          resultado: string;
          status: StatusLance;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          valor?: number;
          percentual?: number;
          data?: string;
          assembleia_id?: string | null;
          grupo?: string;
          cota?: number;
          cliente_id?: string | null;
          resultado?: string;
          status?: StatusLance;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          valor?: number;
          percentual?: number;
          data?: string;
          assembleia_id?: string | null;
          grupo?: string;
          cota?: number;
          cliente_id?: string | null;
          resultado?: string;
          status?: StatusLance;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      contemplacoes: {
        Row: {
          id: string;
          cliente_id: string | null;
          grupo: string;
          cota: number;
          assembleia_id: string | null;
          data: string;
          tipo: TipoContemplacao;
          resultado: string;
          documentos: string;
          observacoes: string;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cliente_id?: string | null;
          grupo?: string;
          cota?: number;
          assembleia_id?: string | null;
          data?: string;
          tipo?: TipoContemplacao;
          resultado?: string;
          documentos?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          cliente_id?: string | null;
          grupo?: string;
          cota?: number;
          assembleia_id?: string | null;
          data?: string;
          tipo?: TipoContemplacao;
          resultado?: string;
          documentos?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      contemplacao_historico: {
        Row: {
          id: string;
          contemplacao_id: string;
          tipo: string;
          descricao: string;
          usuario_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          contemplacao_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          contemplacao_id?: string;
          tipo?: string;
          descricao?: string;
          usuario_id?: string;
          created_at?: string;
        };
      };
      materiais_consultores: {
        Row: {
          id: string;
          titulo: string;
          descricao: string;
          categoria: string;
          arquivo_url: string;
          arquivo_nome: string;
          arquivo_tamanho: number;
          arquivo_mime_type: string;
          tipo: TipoMaterialConsultor;
          status: StatusMaterialConsultor;
          permite_download: boolean;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo?: string;
          descricao?: string;
          categoria?: string;
          arquivo_url?: string;
          arquivo_nome?: string;
          arquivo_tamanho?: number;
          arquivo_mime_type?: string;
          tipo?: TipoMaterialConsultor;
          status?: StatusMaterialConsultor;
          permite_download?: boolean;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string;
          categoria?: string;
          arquivo_url?: string;
          arquivo_nome?: string;
          arquivo_tamanho?: number;
          arquivo_mime_type?: string;
          tipo?: TipoMaterialConsultor;
          status?: StatusMaterialConsultor;
          permite_download?: boolean;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      treinamentos: {
        Row: {
          id: string;
          nome: string;
          descricao: string;
          categoria: string;
          link: string;
          status: StatusTreinamento;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome?: string;
          descricao?: string;
          categoria?: string;
          link?: string;
          status?: StatusTreinamento;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string;
          categoria?: string;
          link?: string;
          status?: StatusTreinamento;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      links_uteis: {
        Row: {
          id: string;
          nome: string;
          descricao: string;
          categoria: string;
          url: string;
          status: StatusLinkUtil;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome?: string;
          descricao?: string;
          categoria?: string;
          url?: string;
          status?: StatusLinkUtil;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string;
          categoria?: string;
          url?: string;
          status?: StatusLinkUtil;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
