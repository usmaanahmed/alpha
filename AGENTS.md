# Repository Guidelines

## Rules to follow before every task

- Read this file before starting every task and apply these rules to all new or changed code.
- Keep code very beginner-friendly, natural, and easy for the project owner to read, understand, and change independently.
- Write complex logic as clear, small steps. Add comments wherever logic is complex to explain what it does and why it is needed.
- Prefer descriptive names, simple functions, ordinary if/else statements, and straightforward loops. Avoid clever shortcuts, dense one-liners, and unnecessary abstractions.
- Avoid advanced programming concepts and design patterns when a simple approach can solve the problem.
- Use basic TypeScript: simple interfaces, type aliases, and explicit parameter and return types where useful. Avoid complicated generics, conditional types, mapped types, and type tricks. Keep strict type checking; do not use any to hide errors.
- Create only the files and layers a feature actually needs. Do not generate empty boilerplate or repetitive comments that merely restate obvious code.
- Apply the architecture below when creating or restructuring backend modules. Do not reorganize existing code unless the task calls for it.

## Architecture and folder structure

- Use a layered, module-based architecture. Create one folder per module inside server/src/modules/, and put all of that module's files directly inside its folder.
- Separate responsibilities into files such as <module>.routes.ts, <module>.controller.ts, <module>.service.ts, <module>.repository.ts, <module>.model.ts, <module>.validator.ts, and <module>.types.ts.
- Do not create routes, controllers, services, repositories, models, validators, or types subfolders inside a module.
- Routes wire URLs and middleware; controllers handle HTTP requests and responses; services contain business logic; repositories handle database access; models define MongoDB documents; validators define input rules; types describe module data.
- Keep shared configuration, middlewares, utilities, validation schemas, and types in their own folders. Create folders and files when needed; avoid empty boilerplate and unnecessary abstractions.
- Follow this backend structure (module files are created only when needed):

```text
server/
  src/
    modules/
      <module-name>/
        <module-name>.routes.ts
        <module-name>.controller.ts
        <module-name>.service.ts
        <module-name>.repository.ts
        <module-name>.model.ts
        <module-name>.validator.ts
        <module-name>.types.ts
    config/
    middlewares/
    validators/       # Shared validation schemas
    types/            # Shared types
    utils/
    app.ts
  server.js
```

## Project Structure & Module Organization

This repository has two independent Node packages. `client/` is the Vite + React
TypeScript application; its source is under `client/src/` (`api/`, `components/`,
`pages/`, `routes/`, `hooks/`, `types/`, and `validators/`). `server/` is the
Express + Mongoose API. Keep API responsibilities separated: routes wire URLs,
controllers implement requests, validators define Zod input rules, models define
MongoDB documents, and middleware enforces cross-cutting behavior. Do not edit
generated `client/dist/` or `server/dist/`; source changes belong in `src/`.

## Build, Test, and Development Commands

Install dependencies in each package with `npm install`. MongoDB must be running
before starting the API.

- `cd server; npm run dev` — run the API with TypeScript watch mode (port 5000).
- `cd server; npm run build` — type-check and compile `src/` to `dist/`.
- `cd server; npm run seed` — create the initial SaaS owner; use other
  `seed:*` scripts only when their data set is required.
- `cd client; npm run dev` — start the Vite client (port 5173).
- `cd client; npm run lint` — run ESLint across client code.
- `cd client; npm run build` — type-check and produce a production client build.

## Coding Style & Naming Conventions

Write strict TypeScript and retain the style of the file you touch: client files
use single quotes and no semicolons; server files currently use double quotes and
semicolons. Use PascalCase for React components and interfaces, camelCase for
variables/functions, and descriptive kebab-free filenames such as
`task.controller.ts` and `PermissionRoute.tsx`. Prefer the client `@/` alias for
imports. Run client ESLint and both builds before submitting.

## Testing Guidelines

No test runner, test scripts, or repository tests are currently configured. For
changes, at minimum run the relevant build and lint commands and manually verify
affected API routes or UI flows. When adding a test stack, keep tests beside their
feature or in a package-level test directory and use `*.test.ts`/`*.test.tsx`.

## Configuration, Commits, and Pull Requests

Copy and adapt each package's `.env.example`; never commit `.env` files or files
in `server/uploads/`. The available checkout has no Git history to establish an
existing commit convention. Use short imperative subjects, for example
`Add task clock validation`. Pull requests should explain the behavior change,
note any schema/env/seed impact, link the issue when available, and include UI
screenshots for visible client changes.
