# Donkey Play

A modern monorepo for Donkey Play built with **Turborepo** and **pnpm workspaces**.

## 1. Tech Stack

- **Monorepo Manager:** [Turborepo](https://turbo.build/)
- **Package Manager:** [pnpm](https://pnpm.io/)
- **Frontend (`apps/web`):** React 19, Vite, TypeScript
- **Backend (`apps/api`):** Node.js, Express.js, TypeScript

---

## 2. Monorepo Structure

```text
donkey-play/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── App.tsx
│   │   │   │   └── App.test.ts
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── matching/
│   │   │   │   ├── chat/
│   │   │   │   ├── video-call/
│   │   │   │   ├── profile/
│   │   │   │   ├── wallet/
│   │   │   │   ├── gifts/
│   │   │   │   └── settings/
│   │   │   ├── shared/
│   │   │   │   ├── components/
│   │   │   │   ├── hooks/
│   │   │   │   ├── modals/
│   │   │   │   ├── layouts/
│   │   │   │   ├── api/
│   │   │   │   ├── utils/
│   │   │   │   ├── constants/
│   │   │   │   ├── types/
│   │   │   │   └── styles/
│   │   │   ├── assets/
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vite.config.ts
│   │
│   └── api/
│       ├── src/
│       │   ├── config/
│       │   ├── common/
│       │   ├── modules/
│       │   ├── app.ts
│       │   └── server.ts
│       ├── tests/
│       │   └── health.test.ts
│       ├── package.json
│       └── tsconfig.json
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
├── .gitignore
├── .env.example
└── README.md
```

---

## 3. Development Ports

- **Frontend (Web):** `http://localhost:5173`
- **Backend (API):** `http://localhost:4000`
  - Health check: `GET http://localhost:4000/api/v1/health`

---

## 4. Getting Started

### Prerequisites

- **Node.js:** `>= 18` (Node 20+ recommended)
- **pnpm:** `^12.11.2` or later

### Installation

```bash
pnpm install
```

### Running Applications

Run both applications in development mode:

```bash
pnpm dev
```

### Building

Build all applications in the monorepo:

```bash
pnpm build
```

### Type Checking

Typecheck all applications with TypeScript:

```bash
pnpm typecheck
```

### Linting

Lint all workspaces:

```bash
pnpm lint
```

### Testing

Run tests across all workspaces:

```bash
pnpm test
```
