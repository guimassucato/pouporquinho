# Pouporquinho

Aplicativo de controle financeiro pessoal — lançamento de despesas e receitas, categorias, formas de pagamento (com fechamento/vencimento de fatura), orçamentos mensais, despesas recorrentes e dashboard com gráficos.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS + shadcn/ui (Base UI)
- **Backend/Banco**: Supabase (Postgres + Auth), acessado diretamente do Next.js via Server Actions, com Row Level Security como camada de isolamento entre usuários
- **Gráficos**: Recharts
- **Validação**: Zod + react-hook-form
- **Testes**: Vitest (lógica de fatura de cartão e regras de negócio puras)

## Rodando localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). A primeira tela pede login/cadastro (Supabase Auth).

As variáveis de ambiente já estão em `.env.local` (não versionado), apontando para o projeto Supabase `pouporquinho`. Para outro projeto Supabase, copie `.env.example` para `.env.local` e preencha:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Banco de dados

As migrations ficam em `supabase/migrations/`, aplicadas em ordem numérica. Para rodar em outro projeto Supabase (via [Supabase CLI](https://supabase.com/docs/guides/local-development)):

```bash
supabase link --project-ref <seu-project-ref>
supabase db push
```

Depois, gere os tipos TypeScript atualizados:

```bash
supabase gen types typescript --project-id <seu-project-ref> > src/types/database.types.ts
```

Antes de qualquer deploy, rode o linter de segurança/performance do Supabase (via MCP `get_advisors` ou `supabase db lint`) para checar RLS e políticas.

## Testes e verificação

```bash
npm run lint        # ESLint
npx tsc --noEmit     # type-check
npm run test         # Vitest
npm run build        # build de produção
```

## Deploy (Vercel)

1. Suba o repositório para o GitHub.
2. Importe o projeto na [Vercel](https://vercel.com/new).
3. Configure as variáveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) no painel do projeto.
4. Em **Supabase Auth → URL Configuration**, adicione a URL de produção da Vercel em *Site URL* e *Redirect URLs* (necessário para o fluxo de confirmação de email/magic link).
5. Deploy.

## Estrutura

```
src/
  app/
    (auth)/         # login, cadastro, callback de auth
    (app)/          # rotas protegidas: dashboard, despesas, receitas, categorias,
                     # formas de pagamento, orçamentos, recorrentes, configurações
  actions/          # Server Actions (uma por domínio)
  components/
    ui/             # componentes shadcn/ui
    forms/          # diálogos de formulário (react-hook-form + Zod)
    layout/         # sidebar, nav mobile, topbar
  lib/
    supabase/       # clients browser/server
    validations/    # schemas Zod
    finance/        # cálculo de fatura, geração de recorrentes, formatação
  proxy.ts          # guarda de rotas (equivalente ao middleware, renomeado no Next 16)
supabase/
  migrations/       # schema + RLS, em ordem
```
