/// <reference types="vite/client" />

type ImportMetaEnv = {
  readonly VITE_GOOGLE_MAPS_API_KEY?: string;
};

type ImportMeta = {
  readonly env: ImportMetaEnv;
};
