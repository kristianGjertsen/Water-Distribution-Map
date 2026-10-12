# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Mappestruktur

```text
src/
├── pages/
│   ├── main/
│   │   ├── MapPage.tsx
│   │   ├── Subcomponents/
│   │   │   ├── Account/
│   │   │   ├── Selector/
│   │   │   ├── MapObject/
│   │   │   └── Drawing/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── services/
│   │   ├── types/
│   │   └── tests/
│   └── auth/
│       └── AuthPage.tsx
├── components/ui/
│   ├── Button.tsx
│   └── Select.tsx
├── shared/
│   ├── auth/
│   └── supabase.ts
├── App.tsx
├── main.tsx
└── index.css
```

Alle sidespesifikke filer hører til sidemappen: hovedkomponent, underkomponenter, hooks, logikk, tjenester, typer og tester. Underkomponenter grupperes etter funksjon og deles videre når det er naturlig. Generelle UI-komponenter beholdes i `components/ui/`.

`shared/` inneholder kode brukt på tvers av sider: Supabase-klienten og autentisering/sesjon. `App.tsx` velger side ut fra sesjonen; bruker- og tilgangspanelet tilhører kartsiden. Oppstart og globale stiler ligger i roten av `src/`.

Kjør `npm run build`, `npm run lint` og `npm test` fra `frontend/`. Testkommandoen finner tester under `src/pages/*/tests/`.
