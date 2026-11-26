import { AuthApi, Configuration } from '@api-client/index'

// Runtime env wins in the SSR container; build-time value is the local dev default.
const runtimeUrl =
  typeof process !== 'undefined' ? process.env.BACKEND_URL : undefined

export const BACKEND_URL =
  runtimeUrl ?? import.meta.env.BACKEND_URL ?? 'http://localhost:8080'

/** Browser-reachable URL, baked at build time; never the Docker service name. */
export const PUBLIC_BACKEND_URL =
  import.meta.env.PUBLIC_BACKEND_URL ?? 'http://localhost:8080'

export const apiConfiguration = new Configuration({
  basePath: BACKEND_URL,
  baseOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true,
  },
})

/** Only the APIs the web app actually calls. Add others here when used. */
export const api = {
  auth: new AuthApi(apiConfiguration),
}
