/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BUREAUCRACY_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
