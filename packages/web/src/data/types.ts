export type ServiceId = string

export type ServiceState = 'connected' | 'expired' | 'none'

export interface Service {
  id: ServiceId
  name: string

  color: string
  state: ServiceState
  account: string | null
}

export type WorkflowStatus = 'on' | 'off' | 'draft' | 'attention'
