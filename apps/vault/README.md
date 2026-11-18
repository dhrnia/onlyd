# MY Vault

MY Vault is a lightweight, static React password manager and saved-links shelf. It has no application database: entries persist in the browser with `localStorage`, and an optional private JSONBin can sync the same JSON payload between devices.

## Run locally

```bash
npm install
npm run dev
```

## JSONBin sync

1. Manually create a private bin at [jsonbin.io](https://jsonbin.io) with `{ "passwords": [], "links": [] }`.
2. Copy `.env.example` to `.env` and add the bin ID and private access key:

```env
VITE_JSONBIN_BIN_ID=your-bin-id
VITE_JSONBIN_ACCESS_KEY=your-private-access-key
```

3. Restart the dev server. Use **Sync** to push this device's vault and the sidebar pull button to pull it on another device.

The `.env` file is ignored by git. JSONBin stores the vault JSON, so use a private bin and treat the access key like a password.

## Commands

- `npm run dev` starts the development server.
- `npm run build` creates a production build.
- `npm run lint` runs Oxlint.# React + TypeScript + Vite

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
