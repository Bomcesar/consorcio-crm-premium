alter table public.clientes
  add column if not exists prospeccao_status text default 'Não contatado',
  add column if not exists ultima_interacao text,
  add column if not exists proxima_acao text,
  add column if not exists data_retorno date;

create table if not exists public.pastas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  cor text default '#3b82f6',
  origem text,
  observacao text,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.pasta_itens (
  id uuid primary key default gen_random_uuid(),
  pasta_id uuid not null references public.pastas(id) on delete cascade,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  prospeccao_status text default 'Não contatado',
  ultimo_contato text,
  proxima_acao text,
  data_retorno date,
  responsavel_id uuid references auth.users(id) on delete set null,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(pasta_id, cliente_id)
);

create table if not exists public.prospeccao_historico (
  id uuid primary key default gen_random_uuid(),
  pasta_item_id uuid not null references public.pasta_itens(id) on delete cascade,
  tipo text not null,
  resultado text not null,
  observacao text,
  proxima_acao text,
  data_retorno date,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_pastas_usuario_id on public.pastas(usuario_id);
create index if not exists idx_pasta_itens_pasta_id on public.pasta_itens(pasta_id);
create index if not exists idx_pasta_itens_cliente_id on public.pasta_itens(cliente_id);
create index if not exists idx_prospeccao_historico_pasta_item_id on public.prospeccao_historico(pasta_item_id);
