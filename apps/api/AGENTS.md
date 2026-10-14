# Backend Architecture & Coding Conventions: Donkey Play API (`apps/api`)

This document defines the architectural standards, conventions, and engineering constraints for any agent or engineer modifying `apps/api`.

---

## 1. Architectural Philosophy: Modular Monolith + Hexagonal Architecture

`apps/api` is built as a **Modular Monolith** applying **Hexagonal Architecture** (Ports and Adapters) and the **Repository Pattern**.

### Core Tenets:
1. **Single Deployable Unit**: The system is a monorepo package running on Node.js/Express, not a distributed microservice swarm.
2. **Strict Module Boundaries**: Each domain is encapsulated in its own module under `src/modules/<module-name>/`.
3. **Inward Dependency Rule**:
   - Presentation (Inbound Adapter) -> Application (Use Cases) -> Domain (Core Entities & Ports).
   - Infrastructure (Outbound Adapter) -> Implements Domain Repository Port.
   - **The Domain NEVER depends on Infrastructure or Presentation.**

---

## 2. Directory Structure per Module

Every business module (e.g. `users`, `matching`, `chat`, `video-call`, `wallet`, `gifts`, `moderation`) must follow this structure:

```text
src/modules/<module-name>/
├── domain/
│   ├── entities/          # Pure domain models with encapsulated business invariants
│   ├── repositories/      # Repository interface contracts (Ports)
│   └── errors/            # Specific domain error classes
├── application/
│   ├── use-cases/         # Application orchestrators injecting repository ports
│   ├── dto/               # Input and Output Data Transfer Objects (contracts)
│   └── services/          # Cross-cutting application services (if needed)
├── infrastructure/
│   ├── persistence/
│   │   ├── mongoose/      # Mongoose schemas and models
│   │   └── repositories/  # Mongoose implementations of repository interfaces
│   └── mappers/           # Bi-directional mappers (Domain Entity <-> Mongoose Document)
├── presentation/
│   └── http/
│       ├── controllers/   # HTTP controllers (Inbound Adapter) handling req/res
│       ├── routes/        # Express router declarations
│       └── validators/    # Zod validation schemas
└── index.ts               # Module Composition Root & public interface
```

---

## 3. Strict Layering Rules & Invariants

### 1. Domain Layer (`domain/`)
- Must contain **pure TypeScript**.
- **FORBIDDEN**: Importing `express`, `mongoose`, database drivers, or presentation utilities.
- Entities must protect their business invariants (encapsulation) using getters and business mutation methods (`updateBio`, `adjustKarma`, `deactivate`), not bare public mutable properties.
- Exposes repository interface contracts (`UserRepository`).

### 2. Application Layer (`application/`)
- Contains single-purpose Use Cases (`RegisterUserUseCase`, `GetUserByIdUseCase`).
- Dependencies (such as repositories) MUST be injected via constructor interfaces.
- **FORBIDDEN**: Direct imports of Mongoose models or Express types (`Request`, `Response`).
- Returns clean DTOs (`UserResponseDTO`), not raw database documents.

### 3. Infrastructure Layer (`infrastructure/`)
- Contains Mongoose schemas, database connections, and repository implementations (`MongooseUserRepository`).
- Repository implementations must satisfy the Domain interface contract (`UserRepository`).
- Use Mappers (`UserMapper`) to translate between Mongoose documents and Domain entities. Mongoose specifics (`_id`, `__v`) must never leak past this layer.

### 4. Presentation Layer (`presentation/`)
- Controllers must ONLY handle HTTP request parsing, calling use cases, and returning JSON responses with status codes.
- No business logic or queries inside controllers.
- Validate all incoming payloads with Zod schemas via `validateRequest` middleware.

### 5. Module Public Contract (`index.ts`)
- Serves as the **Composition Root** for the module (e.g. `createUsersModule()`).
- Exposes:
  - Express `router` to be mounted in `app.ts`.
  - Public Use Cases and Domain types needed by other modules.
- **NEVER** export internal Mongoose schemas, models, or mappers from `index.ts`.

---

## 4. Cross-Module Communication

- Modules must **NOT** query another module's database collections, Mongoose models, or internal files directly.
- Communication between modules must occur via:
  1. Exported Application Use Cases or Services.
  2. In-memory / async domain events.
  3. Shared domain identifiers (e.g., `userId: string`).

---

## 5. Error Handling & Validation Standards

- Extend the centralized `AppError` hierarchy in `src/common/errors/AppError.ts`:
  - `NotFoundError` (404)
  - `ConflictError` (409)
  - `ValidationError` (400)
  - `UnauthorizedError` (401)
- All unhandled exceptions and operational errors pass through `next(error)` to `src/common/middleware/errorHandler.ts`.
- Format of error responses:
  ```json
  {
    "success": false,
    "error": {
      "name": "UserNotFoundError",
      "message": "User with ID '...' was not found",
      "details": null
    }
  }
  ```

---

## 6. Testing Strategy

1. **Domain Entity Unit Tests**: Test domain validation, methods, and invariants in isolation.
2. **Use Case Unit Tests**: Test application logic using in-memory mock repositories (`InMemoryUserRepository`). No MongoDB instance needed.
3. **API Integration Tests**: Test HTTP endpoints using `supertest` with `createApp({ userRepository: inMemoryRepo })` or test databases.

---

## 7. Quality Gates

Before submitting any changes, all of the following commands must succeed cleanly:

```bash
pnpm --filter api lint
pnpm --filter api typecheck
pnpm --filter api test
pnpm --filter api build
```
