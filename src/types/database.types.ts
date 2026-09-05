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
export type StatusPosVenda = string;

export interface PosVendaWithRelations {
  id: string;
  usuario_id: string;
  cliente_id: string;
  agenda_id: string | null;
  status: StatusPosVenda;
  priority: string;
  satisfaction: number;
  next_contact_at: string | null;
  last_contact_at: string | null;
  channel: string;
  needs_attention: boolean;
  observacoes: string;
  created_at: string;
  updated_at: string;
  boleto_url: string;
  lembrete_em: string | null;
  retencao_motivo: string;
  retencao_data: string | null;
  cliente?: { id: string; nome: string; telefone: string; email: string };
}
export type StatusTarefaPosVenda = "Pendente" | "Concluída" | "Cancelada";
export type StatusCobranca = "Pendente" | "Enviado" | "Pago" | "Atrasado" | "Renegociação" | "Cancelado";
export type TipoComunicacao = "WhatsApp" | "Ligação" | "SMS" | "Email";
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
export type PropostaTipo = "Imovel" | "Veiculo" | "Servicos" | "Outros bens moveis";
export type ValorTipo = "Cheio" | "Reduzida";

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
          gestor_id: string | null;
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
          gestor_id?: string | null;
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
          gestor_id?: string | null;
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
          nota_fiscal_url: string | null;
          comprovante_pagamento_url: string | null;
          comprovante_pagamento_data: string | null;
          comprovante_pagamento_mes: number | null;
          comprovante_pagamento_ano: number | null;
          status_pagamento: string;
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
          nota_fiscal_url?: string | null;
          comprovante_pagamento_url?: string | null;
          comprovante_pagamento_data?: string | null;
          comprovante_pagamento_mes?: number | null;
          comprovante_pagamento_ano?: number | null;
          status_pagamento?: string;
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
          nota_fiscal_url?: string | null;
          comprovante_pagamento_url?: string | null;
          comprovante_pagamento_data?: string | null;
          comprovante_pagamento_mes?: number | null;
          comprovante_pagamento_ano?: number | null;
          status_pagamento?: string;
        };
      };
        clientes: {
          Row: {
            id: string;
            nome: string;
            telefone: string;
            email: string;
            cpf_cnpj: string;
            cidade: string;
            estado: string;
            status: StatusCliente;
            origem: string;
            observacoes: string;
            usuario_id: string;
            created_at: string;
            updated_at: string;
            segmento?: string;
            preferencia_contato?: string;
            valor_medio_contrato?: number | null;
            score?: number | null;
            tags?: string | null;
            proxima_acao?: string | null;
            data_proxima_acao?: string | null;
            numero_cota?: string | null;
            numero_grupo?: string | null;
            numero_contrato?: string | null;
            data_cadastro?: string | null;
            data_vencimento?: string | null;
            pagamento_pix?: string | null;
            pix_link?: string | null;
            data_sorteio?: string | null;
            data_assembreia?: string | null;
            comprovante_pagamento?: string | null;
            status_contato?: string;
            data_ultimo_contato?: string | null;
            destino_conversao?: string | null;
            destino_id?: string | null;
          };
          Insert: {
            id?: string;
            nome?: string;
            telefone?: string;
            email?: string;
            cpf_cnpj?: string;
            cidade?: string;
            estado?: string;
            status?: StatusCliente;
            origem?: string;
            observacoes?: string;
            usuario_id?: string;
            created_at?: string;
            updated_at?: string;
            segmento?: string;
            preferencia_contato?: string;
            valor_medio_contrato?: number | null;
            score?: number | null;
            tags?: string | null;
            proxima_acao?: string | null;
            data_proxima_acao?: string | null;
            numero_cota?: string | null;
            numero_grupo?: string | null;
            numero_contrato?: string | null;
            data_cadastro?: string | null;
            data_vencimento?: string | null;
            pagamento_pix?: string | null;
            pix_link?: string | null;
            data_sorteio?: string | null;
            data_assembreia?: string | null;
            comprovante_pagamento?: string | null;
            status_contato?: string;
            data_ultimo_contato?: string | null;
            destino_conversao?: string | null;
            destino_id?: string | null;
          };
          Update: {
            id?: string;
            nome?: string;
            telefone?: string;
            email?: string;
            cpf_cnpj?: string;
            cidade?: string;
            estado?: string;
            status?: StatusCliente;
            origem?: string;
            observacoes?: string;
            usuario_id?: string;
            created_at?: string;
            updated_at?: string;
            segmento?: string;
            preferencia_contato?: string;
            valor_medio_contrato?: number | null;
            score?: number | null;
            tags?: string | null;
            proxima_acao?: string | null;
            data_proxima_acao?: string | null;
            numero_cota?: string | null;
            numero_grupo?: string | null;
            numero_contrato?: string | null;
            data_cadastro?: string | null;
            data_vencimento?: string | null;
            pagamento_pix?: string | null;
            pix_link?: string | null;
            data_sorteio?: string | null;
            data_assembreia?: string | null;
            comprovante_pagamento?: string | null;
            status_contato?: string;
            data_ultimo_contato?: string | null;
            destino_conversao?: string | null;
            destino_id?: string | null;
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
      propostas: {
        Row: {
          id: string;
          negociacao_id: string | null;
          usuario_id: string;
          titulo: string;
          tipo: string;
          conteudo: string;
          link_token: string;
          acessos: number;
          ultima_visualizacao: string | null;
          data_envio: string | null;
          enviado_para: string | null;
          enviado_canal: string | null;
          status: string;
          banner_caminho: string | null;
          valor_parcela_cheia: string | null;
          valor_parcela_reduzida: string | null;
          follow_up_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          negociacao_id?: string | null;
          usuario_id?: string;
          titulo?: string;
          tipo?: string;
          conteudo?: string;
          link_token?: string;
          acessos?: number;
          ultima_visualizacao?: string | null;
          data_envio?: string | null;
          enviado_para?: string | null;
          enviado_canal?: string | null;
          status?: string;
          banner_caminho?: string | null;
          valor_parcela_cheia?: string | null;
          valor_parcela_reduzida?: string | null;
          follow_up_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          negociacao_id?: string | null;
          usuario_id?: string;
          titulo?: string;
          tipo?: string;
          conteudo?: string;
          link_token?: string;
          acessos?: number;
          ultima_visualizacao?: string | null;
          data_envio?: string | null;
          enviado_para?: string | null;
          enviado_canal?: string | null;
          status?: string;
          banner_caminho?: string | null;
          valor_parcela_cheia?: string | null;
          valor_parcela_reduzida?: string | null;
          follow_up_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      proposta_eventos: {
        Row: {
          id: string;
          proposta_id: string;
          evento: string;
          detalhes: string | null;
          ip_origem: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          proposta_id?: string;
          evento?: string;
          detalhes?: string | null;
          ip_origem?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          proposta_id?: string;
          evento?: string;
          detalhes?: string | null;
          ip_origem?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
      };
      proposta_followups: {
        Row: {
          id: string;
          proposta_id: string;
          usuario_id: string;
          tipo: string;
          canal: string;
          observacao: string;
          data_contato: string;
          criado_em: string;
        };
        Insert: {
          id?: string;
          proposta_id?: string;
          usuario_id?: string;
          tipo?: string;
          canal?: string;
          observacao?: string;
          data_contato?: string;
          criado_em?: string;
        };
        Update: {
          id?: string;
          proposta_id?: string;
          usuario_id?: string;
          tipo?: string;
          canal?: string;
          observacao?: string;
          data_contato?: string;
          criado_em?: string;
        };
      };
       pos_venda: {
         Row: {
           id: string;
           usuario_id: string;
           cliente_id: string;
           agenda_id: string | null;
           status: string;
           priority: string;
           satisfaction: number;
           next_contact_at: string | null;
           last_contact_at: string | null;
           channel: string;
           needs_attention: boolean;
           observacoes: string;
           created_at: string;
           updated_at: string;
           boleto_url: string;
           lembrete_em: string | null;
           retencao_motivo: string;
           retencao_data: string | null;
         };
         Insert: {
           id?: string;
           usuario_id?: string;
           cliente_id?: string;
           agenda_id?: string | null;
           status?: string;
           priority?: string;
           satisfaction?: number;
           next_contact_at?: string | null;
           last_contact_at?: string | null;
           channel?: string;
           needs_attention?: boolean;
           observacoes?: string;
           boleto_url?: string;
           lembrete_em?: string | null;
           retencao_motivo?: string;
           retencao_data?: string | null;
           created_at?: string;
           updated_at?: string;
         };
         Update: {
           id?: string;
           usuario_id?: string;
           cliente_id?: string;
           agenda_id?: string | null;
           status?: string;
           priority?: string;
           satisfaction?: number;
           next_contact_at?: string | null;
           last_contact_at?: string | null;
           channel?: string;
           needs_attention?: boolean;
           observacoes?: string;
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
          visivel: boolean;
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
          visivel?: boolean;
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
          visivel?: boolean;
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
          visivel: boolean;
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
          visivel?: boolean;
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
          visivel?: boolean;
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
          visivel: boolean;
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
          visivel?: boolean;
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
          visivel?: boolean;
        };
      };
      parceiros: {
        Row: {
          id: string;
          nome: string;
          cnpj: string;
          contato: string;
          email: string;
          telefone: string;
          tipo: string;
          status: string;
          observacoes: string;
          usuario_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nome?: string;
          cnpj?: string;
          contato?: string;
          email?: string;
          telefone?: string;
          tipo?: string;
          status?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          cnpj?: string;
          contato?: string;
          email?: string;
          telefone?: string;
          tipo?: string;
          status?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      recrutamento: {
        Row: {
          id: string;
          nome: string;
          email: string;
          telefone: string;
          origem: string;
          status: string;
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
          origem?: string;
          status?: string;
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
          origem?: string;
          status?: string;
          observacoes?: string;
          usuario_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_permissions: {
        Row: {
          id: string;
          codigo: string;
          nome: string;
          categoria: string;
          descricao: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          codigo?: string;
          nome?: string;
          categoria?: string;
          descricao?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          codigo?: string;
          nome?: string;
          categoria?: string;
          descricao?: string;
          created_at?: string;
        };
      };
      user_permission_grants: {
        Row: {
          id: string;
          usuario_id: string;
          permissao_id: string;
          concedido_em: string;
          concedido_por: string | null;
        };
        Insert: {
          id?: string;
          usuario_id?: string;
          permissao_id?: string;
          concedido_em?: string;
          concedido_por?: string | null;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          permissao_id?: string;
          concedido_em?: string;
          concedido_por?: string | null;
        };
      };
      metas: {
        Row: {
          id: string;
          titulo: string;
          descricao: string;
          tipo: string;
          valor_alvo: number;
          valor_realizado: number;
          periodo_inicio: string;
          periodo_fim: string;
          usuario_id: string | null;
          perfil_aplicavel: string;
          ativo: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titulo?: string;
          descricao?: string;
          tipo?: string;
          valor_alvo?: number;
          valor_realizado?: number;
          periodo_inicio?: string;
          periodo_fim?: string;
          usuario_id?: string | null;
          perfil_aplicavel?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titulo?: string;
          descricao?: string;
          tipo?: string;
          valor_alvo?: number;
          valor_realizado?: number;
          periodo_inicio?: string;
          periodo_fim?: string;
          usuario_id?: string | null;
          perfil_aplicavel?: string;
          ativo?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_evolution_history: {
        Row: {
          id: string;
          usuario_id: string;
          perfil_anterior: string | null;
          perfil_novo: string;
          gestor_anterior: string | null;
          gestor_novo: string | null;
          motivo: string;
          alterado_por: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          usuario_id?: string;
          perfil_anterior?: string | null;
          perfil_novo?: string;
          gestor_anterior?: string | null;
          gestor_novo?: string | null;
          motivo?: string;
          alterado_por?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          perfil_anterior?: string | null;
          perfil_novo?: string;
          gestor_anterior?: string | null;
          gestor_novo?: string | null;
          motivo?: string;
          alterado_por?: string | null;
          created_at?: string;
        };
      };
      permission_presets: {
        Row: {
          id: string;
          nome: string;
          descricao: string;
          categoria: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome?: string;
          descricao?: string;
          categoria?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          descricao?: string;
          categoria?: string;
          created_at?: string;
        };
      };
       permission_preset_items: {
         Row: {
           id: string;
           preset_id: string;
           permissao_id: string;
           ordem: number;
         };
         Insert: {
           id?: string;
           preset_id?: string;
           permissao_id?: string;
           ordem?: number;
         };
         Update: {
           id?: string;
           preset_id?: string;
           permissao_id?: string;
           ordem?: number;
         };
       };
       pastas: {
         Row: {
           id: string;
           nome: string;
           descricao: string;
           cor: string;
           origem: string;
           observacao: string;
           usuario_id: string;
           created_at: string;
           updated_at: string;
         };
         Insert: {
           id?: string;
           nome?: string;
           descricao?: string;
           cor?: string;
           origem?: string;
           observacao?: string;
           usuario_id?: string;
           created_at?: string;
           updated_at?: string;
         };
         Update: {
           id?: string;
           nome?: string;
           descricao?: string;
           cor?: string;
           origem?: string;
           observacao?: string;
           usuario_id?: string;
           created_at?: string;
           updated_at?: string;
         };
       };
       pasta_itens: {
         Row: {
           id: string;
           pasta_id: string;
           cliente_id: string;
           prospeccao_status: string;
           ultimo_contato: string;
           proxima_acao: string;
           data_retorno: string;
           responsavel_id: string;
           usuario_id: string;
           created_at: string;
           updated_at: string;
           cliente?: {
             id: string;
             nome: string;
             telefone: string;
             observacoes: string;
           };
         };
         Insert: {
           id?: string;
           pasta_id?: string;
           cliente_id?: string;
           prospeccao_status?: string;
           ultimo_contato?: string;
           proxima_acao?: string;
           data_retorno?: string;
           responsavel_id?: string;
           usuario_id?: string;
           created_at?: string;
           updated_at?: string;
         };
         Update: {
           id?: string;
           pasta_id?: string;
           cliente_id?: string;
           prospeccao_status?: string;
           ultimo_contato?: string;
           proxima_acao?: string;
           data_retorno?: string;
           responsavel_id?: string;
           usuario_id?: string;
           created_at?: string;
           updated_at?: string;
         };
       };
       prospeccao_historico: {
         Row: {
           id: string;
           pasta_item_id: string;
           tipo: string;
           resultado: string;
           observacao: string;
           proxima_acao: string;
           data_retorno: string;
           usuario_id: string;
           created_at: string;
         };
         Insert: {
           id?: string;
           pasta_item_id?: string;
           tipo?: string;
           resultado?: string;
           observacao?: string;
           proxima_acao?: string;
           data_retorno?: string;
           usuario_id?: string;
           created_at?: string;
         };
         Update: {
           id?: string;
           pasta_item_id?: string;
           tipo?: string;
           resultado?: string;
           observacao?: string;
           proxima_acao?: string;
           data_retorno?: string;
           usuario_id?: string;
           created_at?: string;
          };
        };
        module_visibility: {
          Row: {
            id: string;
            perfil: string;
            modulo: string;
            href: string;
            titulo: string;
            visivel: boolean;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            perfil?: string;
            modulo?: string;
            href?: string;
            titulo?: string;
            visivel?: boolean;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            perfil?: string;
            modulo?: string;
            href?: string;
            titulo?: string;
            visivel?: boolean;
            created_at?: string;
            updated_at?: string;
          };
        };
        module_item_visibility: {
          Row: {
            id: string;
            module_name: string;
            item_id: string;
            usuario_id: string;
            visivel: boolean;
            created_at: string;
            updated_at: string;
          };
          Insert: {
            id?: string;
            module_name?: string;
            item_id?: string;
            usuario_id?: string;
            visivel?: boolean;
            created_at?: string;
            updated_at?: string;
          };
          Update: {
            id?: string;
            module_name?: string;
            modulo?: string;
            item_id?: string;
            usuario_id?: string;
            visivel?: boolean;
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
