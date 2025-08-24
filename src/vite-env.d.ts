/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEV_MODE: string
  readonly VITE_API_TIMEOUT: string
  readonly VITE_ENABLE_ERROR_LOGGING: string
  readonly VITE_ENABLE_FALLBACK_MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
