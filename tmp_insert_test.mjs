import { createClient } from '@supabase/supabase-js';
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);
const payload = {
  nome: 'Teste Supabase Insert',
  telefone: '11999999999',
  whatsapp: '11999999999',
  email: 'teste@crm.com',
  cidade: 'Sao Paulo',
  estado: 'SP',
  cpf: '00000000000',
  pix: 'teste@pix.com',
  origem: 'Teste',
  profissao: 'Consultor',
  data_entrada: '2026-08-01',
  status: 'Ativo',
  observacoes: 'Teste',
  ativo: true,
  usuario_id: '71408eae-f1f2-42c6-be44-9a1fc8cbd2b7',
  pipeline_stage: 'Novo Indicador',
};
const { data, error } = await supabase.from('indicadores').insert(payload).select().single();
console.log('data:', data);
console.log('error:', error);
