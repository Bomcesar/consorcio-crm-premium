'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';
import { Loader2, Plus } from 'lucide-react';

import { getCreditos, criarCredito } from '@/repositories/client/credito-investimento/credito-investimento.repository';
import { CREDITO_ETAPA_LABEL, type CreditoInvestimento, type CreditoEtapa } from '@/lib/credito-investimento/types';

const ETAPAS: CreditoEtapa[] = ['novo_lead','primeiro_contato','em_conversa','qualificado','reuniao_agendada','apresentacao_realizada','proposta_enviada','em_negociacao','venda_realizada','pos_venda','perdido','sem_interesse'];
const COR: Record<string, string> = { novo_lead: 'bg-slate-100', primeiro_contato: 'bg-blue-50', em_conversa: 'bg-cyan-50', qualificado: 'bg-green-50', reuniao_agendada: 'bg-yellow-50', apresentacao_realizada: 'bg-orange-50', proposta_enviada: 'bg-purple-50', em_negociacao: 'bg-pink-50', venda_realizada: 'bg-emerald-50', pos_venda: 'bg-teal-50', perdido: 'bg-red-50', sem_interesse: 'bg-gray-50' };

export default function CreditoInvestimentoPage() {
  const [creditos, setCreditos] = React.useState<CreditoInvestimento[]>([]);
  const [carregando, setCarregando] = React.useState(true);
  const [modalAberto, setModalAberto] = React.useState(false);
  const [form, setForm] = React.useState({ nome: '', telefone: '', valor_desejado: '', capacidade_mensal: '', objetivo: '', modelo_veiculo: '', origem_lead: '', urgencia_aquisicao: '' });
  const [salvando, setSalvando] = React.useState(false);

  const carregar = React.useCallback(async () => {
    try { setCreditos(await getCreditos()); } catch { toast.error('Nao foi possível carregar os creditos.'); }
  }, []);
  React.useEffect(() => { setCarregando(true); void carregar().finally(() => setCarregando(false)); }, [carregar]);

  const handleCriar = async (e: React.FormEvent) => {
    e.preventDefault(); setSalvando(true);
    try {
      const criado = await criarCredito({ nome: form.nome, telefone: form.telefone, valor_desejado: Number(form.valor_desejado) || 0, capacidade_mensal: Number(form.capacidade_mensal) || 0, objetivo: form.objetivo || null, modelo_veiculo: form.modelo_veiculo || null, origem_lead: form.origem_lead || null, urgencia_aquisicao: form.urgencia_aquisicao || null, etapa: 'novo_lead', probabilidade: 10, usuario_id: '', lead_id: null, cliente_id: null, disponibilidade_lance: false, canal_comunicacao_pref: null, objecoes_identificadas: null, proxima_acao: null, data_retorno: null, observacoes: null });
      setCreditos(prev => [criado, ...prev]); setModalAberto(false);
      setForm({ nome: '', telefone: '', valor_desejado: '', capacidade_mensal: '', objetivo: '', modelo_veiculo: '', origem_lead: '', urgencia_aquisicao: '' });
      toast.success('Credito criado com sucesso.');
    } catch { toast.error('Nao foi possível criar o credito.'); } finally { setSalvando(false); }
  };

  if (carregando) return <div className='flex items-center justify-center py-20'><Loader2 className='h-8 w-8 animate-spin' /></div>;

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div><h1 className='text-2xl font-bold'>Credito Investimento</h1><p className='text-sm text-muted-foreground'>Pipeline comercial de veculos e creditos</p></div>
        <Button onClick={() => setModalAberto(true)}><Plus className='mr-2 h-4 w-4' /> Novo Lead</Button>
      </div>

      <div className='grid gap-4 sm:grid-cols-2 lg:grid-cols-4'>
        <Card><CardHeader className='pb-2'><CardTitle className='text-sm text-muted-foreground'>Total</CardTitle></CardHeader><CardContent><div className='text-2xl font-bold'>{creditos.length}</div></CardContent></Card>
        <Card><CardHeader className='pb-2'><CardTitle className='text-sm text-muted-foreground'>Qualificados</CardTitle></CardHeader><CardContent><div className='text-2xl font-bold text-green-600'>{creditos.filter(c => c.etapa === 'qualificado').length}</div></CardContent></Card>
        <Card><CardHeader className='pb-2'><CardTitle className='text-sm text-muted-foreground'>Em Negociacao</CardTitle></CardHeader><CardContent><div className='text-2xl font-bold text-pink-600'>{creditos.filter(c => c.etapa === 'em_negociacao').length}</div></CardContent></Card>
        <Card><CardHeader className='pb-2'><CardTitle className='text-sm text-muted-foreground'>Vendidos</CardTitle></CardHeader><CardContent><div className='text-2xl font-bold text-emerald-600'>{creditos.filter(c => c.etapa === 'venda_realizada').length}</div></CardContent></Card>
      </div>

      <div className='overflow-x-auto'>
        <div className='flex gap-3 pb-4' style={{ minWidth: 'max-content' }}>
          {ETAPAS.map(etapa => (
            <div key={etapa} className='flex w-64 flex-shrink-0 flex-col'>
              <div className={`rounded-t-lg px-3 py-2 text-xs font-semibold ${COR[etapa]}`}>
                {CREDITO_ETAPA_LABEL[etapa]}
              </div>
              <div className='flex-1 space-y-2 rounded-b-lg border border-t-0 bg-background p-2'>
                {(creditos.filter(c => c.etapa === etapa) ?? []).map(credito => (
                  <div key={credito.id} className='cursor-pointer rounded border bg-card p-2 text-xs hover:shadow'>
                    <p className='font-medium'>{credito.nome}</p>
                    <p className='text-muted-foreground'>R$ {credito.valor_desejado.toLocaleString('pt-BR')}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo Lead</DialogTitle></DialogHeader>
          <form onSubmit={handleCriar} className='space-y-4'>
            <div className='space-y-2'><Label htmlFor='nome'>Nome</Label><Input id='nome' value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required /></div>
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'><Label htmlFor='telefone'>Telefone</Label><Input id='telefone' value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} required /></div>
              <div className='space-y-2'><Label htmlFor='valor_desejado'>Valor desejado</Label><Input id='valor_desejado' type='number' value={form.valor_desejado} onChange={e => setForm(f => ({ ...f, valor_desejado: e.target.value }))} /></div>
            </div>
            <div className='space-y-2'><Label htmlFor='objetivo'>Objetivo</Label><Input id='objetivo' value={form.objetivo} onChange={e => setForm(f => ({ ...f, objetivo: e.target.value }))} /></div>
            <div className='space-y-2'><Label htmlFor='modelo_veiculo'>Modelo do veiculo</Label><Input id='modelo_veiculo' value={form.modelo_veiculo} onChange={e => setForm(f => ({ ...f, modelo_veiculo: e.target.value }))} /></div>
            <DialogFooter><Button type='button' variant='outline' onClick={() => setModalAberto(false)}>Cancel</Button><Button type='submit' disabled={salvando}>{salvando ? <Loader2 className='mr-2 h-4 w-4 animate-spin' /> : 'Criar'}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
