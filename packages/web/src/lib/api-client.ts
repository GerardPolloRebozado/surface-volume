import { AppApi, PingApi, Configuration } from '@api-client/index'

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

export const appApi = new AppApi(apiConfiguration)
export const pingApi = new PingApi(apiConfiguration)
