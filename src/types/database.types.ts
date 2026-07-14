export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nome: string;
          email: string;
          perfil: "Administrador" | "Gestor" | "Consultor" | "Trainee" | "Secretaria" | "Indicador";
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          nome?: string;
          email?: string;
          perfil?: "Administrador" | "Gestor" | "Consultor" | "Trainee" | "Secretaria" | "Indicador";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          email?: string;
          perfil?: "Administrador" | "Gestor" | "Consultor" | "Trainee" | "Secretaria" | "Indicador";
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          nome: string;
          telefone: string;
          cidade: string;
          status: string;
          observacoes: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          nome?: string;
          telefone?: string;
          cidade?: string;
          status?: string;
          observacoes?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nome?: string;
          telefone?: string;
          cidade?: string;
          status?: string;
          observacoes?: string;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
