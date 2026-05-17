# Kamba-Agenda

Plataforma de agendamento para salões angolanos, pensada para gerir serviços, profissionais, horários, reservas, clientes e notificações.

> Sincronize ritmos, agende serviços. Feito para Angola.

## Visão Geral

O Kamba-Agenda esta organizado como um monorepo. Neste momento, o backend fica em `apps/api` e usa NestJS, Prisma e PostgreSQL.

A modelagem inicial cobre:

- usuários com perfis e papéis;
- salões, membros e profissionais;
- serviços, preços e duração;
- horários de funcionamento e disponibilidade;
- agendamentos, slots, lista de espera e avaliações;
- notificações por email e WhatsApp;
- auditoria de ações importantes.

## Stack

- **Backend:** NestJS + TypeScript
- **Banco de dados:** PostgreSQL
- **ORM:** Prisma
- **Validação:** class-validator + class-transformer
- **Testes:** Jest + Supertest

## Estrutura

```text
.
├── apps
│   ├── api
│   │   ├── prisma
│   │   │   └── schema.prisma
│   │   ├── src
│   │   ├── package.json
│   │   └── prisma.config.ts
│   ├── mobile
│   └── web
└── README.md
```

## Requisitos

- Node.js
- npm
- PostgreSQL

## Configuração

Entre na pasta da API:

```bash
cd apps/api
```

Instale as dependências:

```bash
npm install
```

Crie o arquivo `.env` em `apps/api` com a URL do banco:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/kamba_agenda"
PORT=3000
```

Gere o Prisma Client:

```bash
npx prisma generate
```

Quando houver migrations no projeto, aplique com:

```bash
npx prisma migrate dev
```

## Executando

Na pasta `apps/api`, rode:

```bash
npm run start:dev
```

Por padrão, a API sobe em:

```text
http://localhost:3000
```

## Scripts

Comandos disponíveis em `apps/api`:

| Comando | Descrição |
| --- | --- |
| `npm run start` | Inicia a API |
| `npm run start:dev` | Inicia em modo desenvolvimento com watch |
| `npm run start:debug` | Inicia em modo debug |
| `npm run build` | Compila o projeto |
| `npm run start:prod` | Executa a build em `dist` |
| `npm run lint` | Roda ESLint com autofix |
| `npm run format` | Formata arquivos TypeScript |
| `npm run test` | Roda testes unitarios |
| `npm run test:e2e` | Roda testes end-to-end |
| `npm run test:cov` | Roda testes com cobertura |

## Prisma

O schema principal esta em:

```text
apps/api/prisma/schema.prisma
```

Comandos úteis:

```bash
npx prisma generate
npx prisma validate
npx prisma format
npx prisma studio
```

O Prisma Client e gerado em:

```text
apps/api/generated/prisma
```

Esse diretório é ignorado pelo Git porque pode ser recriado a partir do schema.

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
| --- | --- | --- |
| `DATABASE_URL` | Sim | URL de conexão PostgreSQL usada pelo Prisma |
| `PORT` | Não | Porta da API. Padrão: `3000` |

## Estado Atual

O projeto ainda está em fase inicial. A base do backend, configuração do Prisma e schema de domínio já existem; os módulos de negócio, autenticação, endpoints e integrações externas devem ser implementados progressivamente.

## Autor

Américo Malungo
