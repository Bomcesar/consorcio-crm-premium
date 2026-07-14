# CRM Consórcio Premium

Sistema CRM moderno para gestão de clientes de consórcio.

## Stack

- Next.js 15 · TypeScript · Tailwind CSS · shadcn/ui
- Supabase · React Hook Form · Zod · TanStack Table · Lucide React

## Início rápido

```bash
npm install
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

### Login demo (sem Supabase configurado)

- **E-mail:** `admin@crm.com`
- **Senha:** `123456`

### Supabase

1. Copie `.env.local.example` para `.env.local`
2. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Execute as migrations: `npx supabase db push`

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento |
| `npm run build` | Build de produção |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |

## Estrutura

```
src/
├── app/           # Rotas (App Router)
├── components/    # UI e layout
├── config/        # Navegação e constantes
├── lib/           # Supabase, utils, validações
└── types/         # Tipos TypeScript
```
