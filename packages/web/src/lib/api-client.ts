import {
  AppApi,
  PingApi,
  AuthApi,
  Configuration,
} from '@api-client/index'

export const BACKEND_URL = import.meta.env.BACKEND_URL ?? 'http://localhost:8080'

export const apiConfiguration = new Configuration({
  basePath: BACKEND_URL,
  baseOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  },
})

/**
 * All generated API clients, pre-configured with the backend URL.
 * New controllers are added here when the OpenAPI spec changes.
 */
export const api = {
  app: new AppApi(apiConfiguration),
  ping: new PingApi(apiConfiguration),
  auth: new AuthApi(apiConfiguration),
}