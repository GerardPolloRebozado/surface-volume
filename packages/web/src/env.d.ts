import type { AuthUser } from './lib/session'

declare namespace App {
  interface Locals {
    user?: AuthUser
  }
}

declare global {
  interface ImportMetaEnv {
    readonly BACKEND_URL: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
