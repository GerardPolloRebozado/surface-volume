import type { AuthUser } from './lib/session'

declare namespace App {
  interface Locals {
    user?: AuthUser
  }
}
