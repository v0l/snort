# @snort/app

The Snort web client. React 19, Vite and Tailwind.

Build the workspace packages first from the repo root (`bun run build`), then:

```bash
bun run start       # dev server
bun run build       # production build into build/
bun run typecheck
```

`NODE_CONFIG_ENV` picks a config from `config/`, for example `NODE_CONFIG_ENV=iris bun run start`.

Source strings live in `src/lang.json`. Run `bun run pre:commit` from the repo root after changing UI text.
