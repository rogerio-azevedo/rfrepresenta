---
name: project-conventions
description: Convenções da RF Representa para alterações em Next.js, autenticação, clientes, catálogo, Drizzle, Server Actions, DAL e UI protegida. Use ao criar ou revisar código deste projeto; não use como guia genérico para outros repositórios.
---

# Convenções da RF Representa

## Base do projeto

- Use exclusivamente `pnpm` e preserve `pnpm-lock.yaml` como único lockfile.
- O código da aplicação fica em `src/`; rotas usam o App Router em `src/app/`.
- Antes de usar APIs do Next.js, leia o guia relevante em `node_modules/next/dist/docs/` conforme `AGENTS.md`.
- Backend, banco, autenticação e segredos importam `server-only`.

## Arquitetura

- Leituras: Server Component chama o DAL diretamente; não faça `fetch` para uma API interna.
- Mutações: Server Action valida input com Zod, exige autorização, chama o DAL e revalida a rota.
- Route Handlers ficam restritos ao Auth.js e futuras integrações externas.
- `proxy.ts` só antecipa redirects. Toda autorização real é refeita no DAL junto ao dado.
- Retorne DTOs mínimos para a UI e nunca envie hash, token ou row completa a Client Components.

Leia [architecture.md](references/architecture.md) ao criar rotas, actions, DAL ou tabelas.

## Domínio de acesso

- `users` são identidades de login; `clients` são empresas compradoras.
- Um cliente pode ter vários usuários. `ADMIN` não possui `clientId`; `CLIENT` sempre possui.
- Preço pertence ao contexto do cliente. Não associe preço ao usuário e não invente desconto ou tabela sem o modelo do catálogo estar definido.
- Sessão e Zustand nunca são fontes autoritativas de dados de negócio.

Leia [access-model.md](references/access-model.md) ao alterar autenticação, papéis, clientes ou preço.

## Banco

- Schemas Drizzle: `src/server/db/schema/`; Zod: `src/schemas/`; DAL: `src/server/dal/`; Actions: `src/actions/`.
- Uma DAL escreve somente na tabela que possui; uma Action orquestra transações entre entidades.
- Use migrations versionadas: `pnpm db:generate`, revisão do SQL e `pnpm db:migrate`.
- Nunca use `drizzle-kit push` neste projeto.

Leia [security.md](references/security.md) antes de modificar login, senha, sessão, status ou políticas.

## UI

- Server Components são o padrão; use Client Components apenas para interação.
- Use shadcn/ui e ícones Lucide, mantendo o painel denso, simples e responsivo.
- Zustand guarda apenas estado compartilhado de interface, em store criada por provider. Nunca guarde sessão, clientes, produtos ou preços.
- Preserve a identidade visual pública existente; a área operacional usa superfícies claras, verde escuro estrutural e vermelho como ação.
