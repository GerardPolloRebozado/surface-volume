import { useCallback, useMemo, useState, type CSSProperties } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Topbar } from '@/components/Topbar'
import { Icon } from '@/components/Icon'
import { ServiceMark } from '@/components/ServiceMark'
import { Pill } from '@/components/Pill'
import type {
  AppCatalogueEntry,
  CatalogueField,
  Condition,
  ConnectionResource,
  RunDetail,
  WorkflowNode,
  WorkflowResource,
} from '@/data/contract'
import { fetchRunById, runWorkflow, saveWorkflow } from '@/lib/workflows'
import { PUBLIC_BACKEND_URL } from '@/lib/api-client'

type RunTone = 'ok' | 'bad' | 'run'
type FieldMap = Record<string, string>

type Data = {
  name: string
  appId: string
  key: string
  credentialId: string
  inputs: FieldMap
  left: string
  op: Condition['op']
  right: string
  items: string
  forMs: string
  onPatch?: (patch: Partial<Data>) => void
  onRemove?: () => void
  run?: RunTone
  [key: string]: unknown
}

type FlowNode = Node<Data>
const OPS: Condition['op'][] = ['eq', 'neq', 'gt', 'lt', 'contains', 'exists', 'not_exists', 'regex']

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function inputStrings(inputs: Record<string, unknown> = {}): FieldMap {
  const out: FieldMap = {}
  for (const [key, value] of Object.entries(inputs)) {
    if (value === undefined || value === null) continue
    out[key] = Array.isArray(value) ? value.join(',') : String(value)
  }
  return out
}

function firstCondition(groups: Condition[][]): Condition | undefined {
  return groups[0]?.[0]
}

const emptyData = (): Data => ({
  name: '',
  appId: '',
  key: '',
  credentialId: '',
  inputs: {},
  left: '',
  op: 'gt',
  right: '',
  items: '',
  forMs: '1000',
})

function initialNodes(workflow: WorkflowResource | null): FlowNode[] {
  const nodes: FlowNode[] = [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 60, y: 180 },
      data: {
        ...emptyData(),
        appId: workflow?.trigger.appId ?? '',
        key: workflow?.trigger.triggerKey ?? '',
        credentialId: workflow?.trigger.credentialId ?? '',
        inputs: inputStrings(workflow?.trigger.inputs),
      },
    },
  ]

  for (const node of workflow?.nodes ?? []) {
    const data = emptyData()
    const base = { id: node.id, position: { x: 400 + nodes.length * 290, y: 180 }, data }
    if (node.type === 'action') {
      nodes.push({
        ...base,
        type: 'action',
        data: {
          ...data,
          appId: node.appId,
          key: node.actionKey,
          credentialId: node.credentialId ?? '',
          inputs: inputStrings(node.inputs),
        },
      })
    } else if (node.type === 'branch') {
      const cond = firstCondition(node.paths[0]?.conditions ?? [])
      nodes.push({ ...base, type: 'branch', data: { ...data, left: cond?.left ?? '', op: cond?.op ?? 'gt', right: cond?.right ?? '' } })
    } else if (node.type === 'filter') {
      const cond = firstCondition(node.conditions)
      nodes.push({ ...base, type: 'filter', data: { ...data, left: cond?.left ?? '', op: cond?.op ?? 'gt', right: cond?.right ?? '' } })
    } else if (node.type === 'loop') {
      nodes.push({ ...base, type: 'loop', data: { ...data, items: node.items } })
    } else if (node.type === 'delay') {
      nodes.push({ ...base, type: 'delay', data: { ...data, forMs: String(node.forMs ?? 1000) } })
    }
  }

  return nodes
}

function initialEdges(workflow: WorkflowResource | null): Edge[] {
  return (workflow?.links ?? []).map((link, index) => ({
    id: link.id || `edge-${index}`,
    source: link.from,
    target: link.to,
    sourceHandle: link.fromPath === 'yes' || link.fromPath === 'no' ? link.fromPath : 'out',
    targetHandle: 'in',
    type: 'smoothstep',
  }))
}

const KIND_LABEL: Record<string, string> = {
  trigger: 'Trigger',
  action: 'Action',
  branch: 'Condition',
  filter: 'Filter',
  loop: 'Loop',
  delay: 'Delay',
}

function Port({
  type,
  position,
  id,
  style,
}: {
  type: 'source' | 'target'
  position: Position
  id: string
  style: CSSProperties
}) {
  return <Handle type={type} position={position} id={id} className="port nodrag" style={style} />
}

function StatusIcon({ tone }: { tone?: RunTone }) {
  if (!tone) return null
  const name = tone === 'ok' ? 'check' : tone === 'bad' ? 'x' : 'dot'
  const className = tone === 'ok' ? 'tone-ok' : tone === 'bad' ? 'tone-bad' : 'text-faint'
  return <span className={className}><Icon name={name} size={13} /></span>
}

function TriggerCard({ id, data, selected }: NodeProps<Node<Data>>) {
  return (
    <div className="node-card px-3 pt-2.5 pb-2" data-selected={selected} data-run={data.run}>
      <Port type="source" position={Position.Right} id="out" style={{ right: -7, top: 21 }} />
      <div className="flex items-center gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-accent text-[10.5px] font-semibold text-on-accent">1</span>
        <ServiceMark id={data.appId} size={24} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold leading-tight">{data.name || data.key || 'Trigger'}</div>
          <div className="truncate text-[10.5px] text-mute">{KIND_LABEL.trigger} · {data.appId || 'No service'}</div>
        </div>
        <StatusIcon tone={data.run} />
      </div>
      <div className="mt-1 truncate font-mono text-[10.5px] text-faint">{data.key || 'Choose a trigger'}</div>
    </div>
  )
}

function ActionCard({ data, selected }: NodeProps<Node<Data>>) {
  return (
    <div className="node-card px-3 pt-2.5 pb-2" data-selected={selected} data-run={data.run}>
      <Port type="target" position={Position.Left} id="in" style={{ left: -7, top: 21 }} />
      <Port type="source" position={Position.Right} id="out" style={{ right: -7, top: 21 }} />
      <div className="flex items-center gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-fill text-[10.5px] font-semibold text-mute">·</span>
        <ServiceMark id={data.appId} size={24} />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold leading-tight">{data.name || data.key || 'Action'}</div>
          <div className="truncate text-[10.5px] text-mute">{KIND_LABEL.action} · {data.appId || 'No service'}</div>
        </div>
        <StatusIcon tone={data.run} />
        <button type="button" className="btn btn-ghost btn-icon btn-sm nodrag" onClick={() => data.onRemove?.()} aria-label="Remove step">
          <Icon name="x" size={13} />
        </button>
      </div>
      <div className="mt-1 truncate font-mono text-[10.5px] text-faint">{Object.values(data.inputs).find(Boolean)?.toString().slice(0, 42) || data.key || 'Not configured'}</div>
    </div>
  )
}

function ConditionCard({ data, selected }: NodeProps<Node<Data>>) {
  return (
    <div className="node-card px-3 pt-2.5 pb-2" data-selected={selected} data-run={data.run}>
      <Port type="target" position={Position.Left} id="in" style={{ left: -7, top: 21 }} />
      <div className="flex items-center gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-warn-soft text-[10.5px] font-semibold text-warn">?</span>
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-warn-soft text-warn"><Icon name="split" size={13} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold leading-tight">{data.name || 'Condition'}</div>
          <div className="truncate text-[10.5px] text-mute">{KIND_LABEL.branch}</div>
        </div>
        <StatusIcon tone={data.run} />
        <button type="button" className="btn btn-ghost btn-icon btn-sm nodrag" onClick={() => data.onRemove?.()} aria-label="Remove step">
          <Icon name="x" size={13} />
        </button>
      </div>
      <div className="mt-1.5 space-y-0.5 font-mono text-[10.5px]">
        <div className="truncate"><span className="text-faint">if </span>{data.left || '…'}</div>
        <div className="truncate"><span className="text-faint">{data.op} </span>{data.right || '…'}</div>
      </div>
      <div className="mt-1.5 flex justify-between text-[9.5px] font-semibold">
        <span className="text-ok">YES</span>
        <span className="text-no">NO</span>
      </div>
      <Port type="source" position={Position.Right} id="yes" style={{ right: -7, top: 58 }} />
      <Port type="source" position={Position.Right} id="no" style={{ right: -7, top: 84 }} />
    </div>
  )
}

function SimpleCard({ data, selected, kind, icon }: NodeProps<Node<Data>> & { kind: string; icon: 'filter' | 'refresh' | 'clock' }) {
  const tone = kind === 'loop' ? 'ok' : kind === 'filter' ? 'warn' : 'mute'
  const preview = kind === 'loop' ? data.items : kind === 'filter' ? `${data.left} ${data.op} ${data.right}` : `${data.forMs} ms`
  return (
    <div className="node-card px-3 pt-2.5 pb-2" data-selected={selected} data-run={data.run}>
      <Port type="target" position={Position.Left} id="in" style={{ left: -7, top: 21 }} />
      <Port type="source" position={Position.Right} id="out" style={{ right: -7, top: 21 }} />
      <div className="flex items-center gap-2">
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-[6px] bg-fill text-[10.5px] font-semibold text-mute">·</span>
        <span className={`grid h-6 w-6 place-items-center rounded-lg ${tone === 'ok' ? 'bg-ok-soft text-ok' : tone === 'warn' ? 'bg-warn-soft text-warn' : 'bg-fill text-mute'}`}><Icon name={icon} size={13} /></span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[12.5px] font-semibold leading-tight">{data.name || KIND_LABEL[kind]}</div>
          <div className="truncate text-[10.5px] text-mute">{KIND_LABEL[kind]}</div>
        </div>
        <StatusIcon tone={data.run} />
        <button type="button" className="btn btn-ghost btn-icon btn-sm nodrag" onClick={() => data.onRemove?.()} aria-label="Remove step">
          <Icon name="x" size={13} />
        </button>
      </div>
      <div className="mt-1 truncate font-mono text-[10.5px] text-faint">{preview || 'Not configured'}</div>
    </div>
  )
}

const FilterCard = (props: NodeProps<Node<Data>>) => <SimpleCard {...props} kind="filter" icon="filter" />
const LoopCard = (props: NodeProps<Node<Data>>) => <SimpleCard {...props} kind="loop" icon="refresh" />
const DelayCard = (props: NodeProps<Node<Data>>) => <SimpleCard {...props} kind="delay" icon="clock" />

const nodeTypes = {
  trigger: TriggerCard,
  action: ActionCard,
  branch: ConditionCard,
  filter: FilterCard,
  loop: LoopCard,
  delay: DelayCard,
}

function FieldEditor({
  field,
  value,
  onChange,
  onFocus,
}: {
  field: CatalogueField
  value: string
  onChange: (value: string) => void
  onFocus: () => void
}) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-center gap-1.5">
        <span className="label flex-1">{field.label}</span>
        {field.required ? <span className="pill !py-0 !px-1.5 !text-[9.5px] !text-warn">required</span> : null}
        <span className="pill !py-0 !px-1.5 !text-[9.5px] font-mono">{field.type}</span>
      </div>
      {field.type === 'select' && field.choices ? (
        <select className="select mt-1.5 w-full" value={value} onChange={(event) => onChange(event.target.value)} onFocus={onFocus}>
          <option value="">Default</option>
          {Object.entries(field.choices).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      ) : (
        <input
          className="input mt-1.5 w-full font-mono text-[12px]"
          type={field.secret ? 'password' : 'text'}
          value={value}
          placeholder={field.key === 'status' ? '{{ trigger.account }}' : ''}
          onChange={(event) => onChange(event.target.value)}
          onFocus={onFocus}
        />
      )}
      {field.helpText ? <span className="hint mt-1 block">{field.helpText}</span> : null}
      {value.includes('{{') ? <div className="ref mt-1.5">{value}</div> : null}
    </div>
  )
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function BuilderInner({
  workflowId,
  workflow,
  apps,
  connections,
}: {
  workflowId: string
  workflow: WorkflowResource | null
  apps: AppCatalogueEntry[]
  connections: ConnectionResource[]
}) {
  const [name, setName] = useState(workflow?.name ?? 'Untitled workflow')
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initialNodes(workflow))
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initialEdges(workflow))
  const [selected, setSelected] = useState('trigger')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [issuesOpen, setIssuesOpen] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [running, setRunning] = useState(false)
  const [message, setMessage] = useState('')
  const [runStatus, setRunStatus] = useState<Record<string, RunTone>>({})
  const [tab, setTab] = useState<'configure' | 'data' | 'output'>('configure')
  const [mappingTarget, setMappingTarget] = useState<string | null>(null)
  const flow = useReactFlow()

  const activeConnections = useMemo(() => connections.filter((item) => item.status === 'active'), [connections])

  const patch = useCallback((id: string, data: Partial<Data>) => {
    setDirty(true)
    setNodes((current) => current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...data } } : node)))
  }, [setNodes])

  const removeNode = useCallback((id: string) => {
    setDirty(true)
    setNodes((current) => current.filter((node) => node.id !== id))
    setEdges((current) => current.filter((edge) => edge.source !== id && edge.target !== id))
  }, [setNodes, setEdges])

  const nodesWithData = useMemo(
    () =>
      nodes.map((node, index) => ({
        ...node,
        data: {
          ...node.data,
          name: node.data.name || (node.type === 'trigger' ? 'Trigger' : `Step ${index + 1}`),
          onPatch: (data: Partial<Data>) => patch(node.id, data),
          onRemove: () => removeNode(node.id),
          run: runStatus[node.id],
        },
      })),
    [nodes, patch, removeNode, runStatus],
  )

  const onConnect = useCallback((connection: Connection) => {
    setDirty(true)
    setEdges((current) => addEdge({ ...connection, type: 'smoothstep', sourceHandle: connection.sourceHandle ?? 'out' }, current))
  }, [setEdges])

  const issues = useMemo(() => {
    const found: { id: string; text: string }[] = []
    const trigger = nodes.find((node) => node.type === 'trigger')
    const appById = (id: string) => apps.find((app) => app.id === id)
    if (!trigger || !trigger.data.appId || !trigger.data.key) {
      found.push({ id: 'trigger', text: 'Choose the service and trigger that starts this workflow.' })
    } else if (appById(trigger.data.appId)?.auth.type !== 'none' && !trigger.data.credentialId) {
      found.push({ id: 'trigger', text: 'The trigger needs a connected account.' })
    }
    for (const node of nodes.filter((item) => item.type !== 'trigger')) {
      if (node.type === 'action' && (!node.data.appId || !node.data.key)) {
        found.push({ id: node.id, text: 'Choose a service and action for this step.' })
      } else if (node.type === 'action' && appById(node.data.appId)?.auth.type !== 'none' && !node.data.credentialId) {
        found.push({ id: node.id, text: 'This action needs a connected account.' })
      }
      if (node.type === 'branch') {
        const outgoing = edges.filter((edge) => edge.source === node.id)
        if (!outgoing.some((edge) => edge.sourceHandle === 'yes')) found.push({ id: node.id, text: 'Connect the YES port of this condition.' })
        if (!outgoing.some((edge) => edge.sourceHandle === 'no')) found.push({ id: node.id, text: 'Connect the NO port of this condition.' })
      }
      if (!edges.some((edge) => edge.target === node.id)) {
        found.push({ id: node.id, text: 'This step is not connected to the trigger.' })
      }
    }
    if (nodes.filter((node) => node.type !== 'trigger').length === 0) {
      found.push({ id: 'trigger', text: 'Add at least one step before enabling the workflow.' })
    }
    return found
  }, [nodes, edges, apps])

  function addNode(kind: 'action' | 'branch' | 'filter' | 'loop' | 'delay') {
    const last = nodes[nodes.length - 1]
    const id = newId(kind)
    setDirty(true)
    setNodes((current) => [
      ...current,
      { id, type: kind, position: { x: (last?.position.x ?? 60) + 300, y: last?.position.y ?? 180 }, data: emptyData() },
    ])
    setSelected(id)
    setTab('configure')
    setPaletteOpen(false)
  }

  const selectedNode = nodes.find((node) => node.id === selected)
  const selectedApp = apps.find((app) => app.id === selectedNode?.data.appId)
  const selectedFields = selectedNode?.type === 'trigger'
    ? selectedApp?.triggerFields[selectedNode.data.key] ?? []
    : selectedApp?.actionFields[selectedNode.data.key] ?? []
  const selectedOutputs = selectedNode?.type === 'trigger'
    ? selectedApp?.triggerOutputs[selectedNode.data.key] ?? []
    : selectedApp?.actionOutputs[selectedNode.data.key] ?? []

  const upstream = useMemo(() => {
    if (!selected) return []
    const seen = new Set<string>([selected])
    let changed = true
    while (changed) {
      changed = false
      for (const edge of edges) {
        if (edge.target === selected && edge.source !== selected && !seen.has(edge.source)) {
          seen.add(edge.source)
          changed = true
        }
      }
    }
    return nodes.filter((node) => seen.has(node.id) && node.id !== selected)
  }, [nodes, edges, selected])

  function definition() {
    const trigger = nodes.find((node) => node.type === 'trigger')
    const data = trigger?.data
    const inputs: Record<string, unknown> = { ...(data?.inputs ?? {}) }
    inputs.intervalSec = Number(inputs.intervalSec) || 60
    if (data?.key === 'new_notification') {
      inputs.types = String(inputs.types || 'mention,status').split(',').map((value) => value.trim()).filter(Boolean)
    }

    const graphNodes: WorkflowNode[] = nodes
      .filter((node) => node.type !== 'trigger')
      .map((node) => {
        const item = node.data
        if (node.type === 'branch') {
          const condition: Condition = { left: item.left || 'value', op: item.op, right: item.right }
          return { id: node.id, name: item.name, type: 'branch', paths: [{ name: 'yes', conditions: [[condition]] }, { name: 'no', conditions: [] }] }
        }
        if (node.type === 'filter') {
          return { id: node.id, name: item.name, type: 'filter', conditions: [[{ left: item.left || 'value', op: item.op, right: item.right }]] }
        }
        if (node.type === 'loop') return { id: node.id, name: item.name, type: 'loop', items: item.items || 'trigger.items' }
        if (node.type === 'delay') return { id: node.id, name: item.name, type: 'delay', forMs: Number(item.forMs) || 1000 }
        return { id: node.id, name: item.name, type: 'action', appId: item.appId, actionKey: item.key, credentialId: item.credentialId || undefined, inputs: item.inputs }
      })

    return {
      trigger: {
        id: 'trigger',
        appId: data?.appId ?? '',
        triggerKey: data?.key ?? '',
        credentialId: data?.credentialId || undefined,
        inputs,
      },
      nodes: graphNodes,
      links: edges.map((edge, index) => ({
        id: `link-${index}`,
        from: edge.source,
        fromPath: edge.sourceHandle === 'yes' || edge.sourceHandle === 'no' ? edge.sourceHandle : undefined,
        to: edge.target,
      })),
    }
  }

  async function persist(): Promise<boolean> {
    setMessage('')
    try {
      await saveWorkflow(workflowId, { name, definition: definition() })
      setDirty(false)
      setSaved(true)
      return true
    } catch (error) {
      setMessage((error as Error).message)
      return false
    }
  }

  async function enable() {
    if (issues.length > 0) {
      setIssuesOpen(true)
      setMessage('Fix the highlighted issues before enabling.')
      return
    }
    if (!(await persist())) return
    setRunning(true)
    try {
      const response = await fetch(`${PUBLIC_BACKEND_URL}/workflows/${workflowId}/enable`, {
        method: 'POST',
        credentials: 'include',
      })
      if (!response.ok) throw new Error(await response.text())
      setMessage('Workflow enabled')
      window.setTimeout(() => { window.location.href = '/workflows' }, 500)
    } catch (error) {
      setMessage((error as Error).message)
      setRunning(false)
    }
  }

  async function run() {
    if (!(await persist())) return
    setRunning(true)
    setRunStatus({ trigger: 'run' })
    setMessage('Starting run…')
    try {
      const result = await runWorkflow(workflowId)
      let detail: RunDetail | null = null
      for (let i = 0; i < 30; i += 1) {
        detail = await fetchRunById(result.runId)
        if (['succeeded', 'failed', 'cancelled'].includes(detail.status)) break
        await sleep(700)
      }
      const next: Record<string, RunTone> = {}
      for (const step of detail?.steps ?? []) {
        next[step.nodeId] = step.status === 'succeeded' ? 'ok' : 'failed' ? 'bad' : 'run'
      }
      setRunStatus(next)
      setMessage(`Run ${detail?.status ?? 'unknown'}`)
    } catch (error) {
      setMessage((error as Error).message)
    } finally {
      setRunning(false)
    }
  }

  function insertRef(tokenText: string) {
    if (!selectedNode) return
    const key = mappingTarget ?? Object.keys(selectedNode.data.inputs)[0] ?? 'status'
    patch(selectedNode.id, { inputs: { ...selectedNode.data.inputs, [key]: tokenText } })
    setTab('configure')
  }

  const stepOf = (id: string) => {
    const index = nodes.findIndex((node) => node.id === id)
    return id === 'trigger' ? '1' : String(index + 1)
  }

  return (
    <div className="flex h-full flex-col bg-win">
      <Topbar title="Builder" subtitle="Drag nodes. Pull a port to another node to link them.">
        <a href="/workflows" className="btn btn-ghost btn-icon btn-sm" aria-label="Back to workflows">
          <Icon name="arrow-left" size={17} />
        </a>
        <input
          value={name}
          onChange={(event) => { setName(event.target.value); setDirty(true) }}
          className="w-full max-w-[260px] rounded-lg border border-transparent bg-transparent px-2 py-1 text-[13.5px] font-semibold hover:border-line focus:border-line"
          aria-label="Workflow name"
        />
        <span className="hidden items-center gap-1.5 text-[11px] text-mute xl:inline-flex">
          <span className={`h-1.5 w-1.5 rounded-full ${dirty ? 'bg-warn' : 'bg-ok'}`} />
          {dirty ? 'Unsaved' : 'Saved'}
        </span>
        <button
          type="button"
          className={`pill ${issues.length ? 'pill-warn' : 'pill-ok'}`}
          onClick={() => setIssuesOpen((value) => !value)}
          aria-label={issues.length ? `${issues.length} issues` : 'Workflow is valid'}
        >
          <Icon name={issues.length ? 'alert' : 'check'} size={13} />
          {issues.length ? `${issues.length} issues` : 'Valid'}
        </button>
        <button type="button" className="btn btn-sm" disabled={running} onClick={run}>
          <Icon name={running ? 'pause' : 'play'} size={14} />
          <span className="hidden md:inline">{running ? 'Running…' : 'Test run'}</span>
        </button>
        <button type="button" className="btn btn-accent btn-sm" onClick={persist}>
          <Icon name="check" size={14} />
          Save
        </button>
        {issuesOpen ? (
          <div className="absolute right-3 top-[52px] z-50 w-[min(380px,calc(100vw-24px))] card p-2 rise" role="dialog">
            <div className="flex items-center gap-2 px-2 py-1.5">
              <span className="flex-1 text-[12px] font-semibold">{issues.length ? `${issues.length} issues` : 'Workflow is valid'}</span>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setIssuesOpen(false)} aria-label="Close"><Icon name="x" size={14} /></button>
            </div>
            <div className="scroll max-h-[50vh] space-y-0.5 overflow-auto">
              {issues.length === 0 ? <div className="px-2 py-4 text-[12px] text-mute">Everything is connected.</div> : null}
              {issues.map((issue, index) => (
                <button
                  key={`${issue.id}-${index}`}
                  type="button"
                  className="flex w-full items-start gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-fill"
                  onClick={() => { setSelected(issue.id); setIssuesOpen(false) }}
                >
                  <span className="mt-0.5 shrink-0 tone-warn"><Icon name="alert" size={14} /></span>
                  <span className="flex-1 text-[12px] leading-snug">{issue.text}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </Topbar>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[240px] shrink-0 flex-col border-r border-line bg-card lg:flex" aria-label="Steps">
          <div className="flex items-center gap-2 px-3 pb-2 pt-3">
            <h2 className="flex-1 text-[12px] font-semibold">Steps</h2>
            <span className="num text-[11px] text-faint">{nodes.length}</span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setPaletteOpen(true)} aria-label="Add step"><Icon name="plus" size={15} /></button>
          </div>
          <div className="scroll flex-1 space-y-0.5 overflow-auto px-2 pb-3">
            {nodes.map((node, index) => (
              <button
                key={node.id}
                type="button"
                onClick={() => { setSelected(node.id); setTab('configure') }}
                className={`flex w-full items-center gap-2 rounded-lg py-[7px] pr-2 text-left ${selected === node.id ? 'bg-fill' : 'hover:bg-fill'}`}
                style={{ paddingLeft: 6 }}
              >
                <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] text-[10px] font-semibold ${selected === node.id ? 'bg-accent text-on-accent' : 'bg-fill text-mute'}`}>{index + 1}</span>
                <ServiceMark id={node.data.appId} size={14} />
                <span className={`flex-1 truncate text-[12px] ${issues.some((issue) => issue.id === node.id) ? 'text-warn' : ''}`}>{node.data.name || KIND_LABEL[node.type ?? '']}</span>
              </button>
            ))}
            <button type="button" onClick={() => setPaletteOpen(true)} className="ml-1.5 mt-1 flex w-[calc(100%-12px)] items-center gap-2 rounded-lg border border-dashed border-line px-2 py-[7px] text-left text-[12px] text-faint hover:border-accent hover:text-accent">
              <span className="grid h-[18px] w-[18px] place-items-center rounded-[5px] text-[10px]">+</span>
              Add step
            </button>
          </div>
          <div className="border-t border-line p-2.5">
            <p className="text-[10.5px] leading-relaxed text-faint">Select a step to configure it. Drag from a port to connect steps.</p>
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col">
          <div className="canvas-bg relative min-h-0 flex-1 overflow-hidden">
            <ReactFlow
              nodes={nodesWithData}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={(_, node) => { setSelected(node.id); setTab('configure') }}
              nodeTypes={nodeTypes}
              fitView
              defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: 'var(--line-strong)', strokeWidth: 1.8 } }}
            >
              <MiniMap nodeColor={() => 'var(--accent)'} maskColor="rgba(0,0,0,0.08)" />
            </ReactFlow>

            <div className="card absolute left-3 top-3 z-20 flex items-center gap-0.5 p-1" role="toolbar">
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setPaletteOpen((value) => !value)} aria-label="Add step"><Icon name="plus" size={15} /></button>
              <span className="mx-0.5 h-4 w-px bg-line" />
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => flow.zoomOut()} aria-label="Zoom out"><Icon name="zoom-out" size={15} /></button>
              <button type="button" className="btn btn-ghost btn-sm num !px-1.5 text-[11px]" onClick={() => flow.setViewport({ x: 0, y: 0, zoom: 1 })} aria-label="Reset zoom">100%</button>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => flow.zoomIn()} aria-label="Zoom in"><Icon name="zoom-in" size={15} /></button>
              <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => flow.fitView()} aria-label="Fit view"><Icon name="fit" size={15} /></button>
            </div>

            {paletteOpen ? (
              <div className="card absolute left-3 top-[64px] z-30 w-[220px] space-y-1.5 p-2 rise" style={{ boxShadow: 'var(--shadow-pop)' }}>
                <div className="px-1 pb-1 text-[11px] font-semibold text-mute">Add a step</div>
                {([
                  ['action', 'Action', 'bolt'],
                  ['branch', 'If / branch', 'split'],
                  ['filter', 'Filter', 'filter'],
                  ['loop', 'Loop', 'refresh'],
                  ['delay', 'Delay', 'clock'],
                ] as const).map(([kind, label, icon]) => (
                  <button key={kind} type="button" onClick={() => addNode(kind)} className="flex w-full items-center gap-2 rounded-lg border border-line bg-fill px-2.5 py-2 text-left text-[12.5px] hover:border-accent hover:text-accent">
                    <Icon name={icon} size={15} />
                    {label}
                  </button>
                ))}
              </div>
            ) : null}

            {message ? (
              <div className="card absolute bottom-3 left-1/2 z-30 flex w-[min(660px,calc(100%-24px))] -translate-x-1/2 items-center gap-2.5 p-2.5 rise" style={{ boxShadow: 'var(--shadow-pop)' }} role="status">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                  <Icon name={message.startsWith('Run failed') ? 'alert' : 'play'} size={14} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-semibold">Test run</div>
                  <div className="truncate text-[11px] text-mute">{message}</div>
                </div>
                <div className="hidden items-center gap-1 sm:flex" aria-hidden="true">
                  {nodes.map((node) => (
                    <span key={node.id} className={`h-2 w-2 rounded-full ${runStatus[node.id] === 'ok' ? 'bg-ok' : runStatus[node.id] === 'bad' ? 'bg-bad' : 'bg-fill'}`} />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </section>

        <aside className="hidden w-[340px] shrink-0 flex-col border-l border-line bg-card md:flex" aria-label="Configure">
          {!selectedNode ? (
            <div className="inspector-empty flex-1">
              <div>
                <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl text-mute" style={{ background: 'var(--fill)' }}><Icon name="list" size={20} /></span>
                <p className="mx-auto mt-3 max-w-[24ch] text-[12.5px] text-mute">Select a step to configure it.</p>
              </div>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col">
              <div className="border-b border-line px-4 pb-3 pt-4">
                <div className="flex items-start gap-2.5">
                  <ServiceMark id={selectedNode.data.appId} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13.5px] font-semibold">{selectedNode.data.name || KIND_LABEL[selectedNode.type ?? '']}</div>
                    <div className="truncate text-[11px] text-mute">{KIND_LABEL[selectedNode.type ?? '']} · {selectedApp?.name ?? selectedNode.data.appId ?? 'No service'}</div>
                  </div>
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setSelected('')} aria-label="Close panel"><Icon name="x" size={15} /></button>
                </div>
                <div className="seg mt-3 flex w-full" role="tablist">
                  {(['configure', 'data', 'output'] as const).map((value) => (
                    <button key={value} type="button" role="tab" aria-selected={tab === value} className="flex-1 justify-center" onClick={() => setTab(value)}>
                      {value === 'configure' ? 'Configure' : value === 'data' ? `Data · ${upstream.length}` : 'Output'}
                    </button>
                  ))}
                </div>
              </div>

              {tab === 'configure' ? (
                <div className="scroll flex-1 space-y-4 overflow-auto px-4 py-4" role="tabpanel">
                  <label className="block">
                    <span className="label">Name</span>
                    <input className="input mt-1" value={selectedNode.data.name} maxLength={60} onChange={(event) => patch(selectedNode.id, { name: event.target.value })} />
                  </label>

                  {(selectedNode.type === 'trigger' || selectedNode.type === 'action') ? (
                    <>
                      <label className="block">
                        <span className="label">Service</span>
                        <select className="select mt-1" value={selectedNode.data.appId} onChange={(event) => { patch(selectedNode.id, { appId: event.target.value, key: '', credentialId: '', inputs: {} }); setMappingTarget(null) }}>
                          <option value="">Choose a service</option>
                          {apps.filter((app) => Object.keys(selectedNode.type === 'trigger' ? app.triggers : app.actions).length > 0).map((app) => <option key={app.id} value={app.id}>{app.name}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="label">{selectedNode.type === 'trigger' ? 'Trigger' : 'Action'}</span>
                        <select className="select mt-1" value={selectedNode.data.key} onChange={(event) => { patch(selectedNode.id, { key: event.target.value, inputs: {} }); setMappingTarget(null) }}>
                          <option value="">Choose one</option>
                          {Object.entries(selectedNode.type === 'trigger' ? selectedApp?.triggers ?? {} : selectedApp?.actions ?? {}).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                        </select>
                      </label>
                      {selectedApp && selectedApp.auth.type !== 'none' ? (
                        <label className="block">
                          <span className="label">Connection</span>
                          <select className="select mt-1" value={selectedNode.data.credentialId} onChange={(event) => patch(selectedNode.id, { credentialId: event.target.value })}>
                            <option value="">None</option>
                            {activeConnections.filter((item) => item.appId === selectedNode.data.appId).map((item) => <option key={item.id} value={item.id}>{item.account ?? item.appName}</option>)}
                          </select>
                        </label>
                      ) : null}
                      {selectedNode.type === 'trigger' ? (
                        <label className="block">
                          <span className="label">Poll interval (seconds)</span>
                          <input className="input mt-1" type="number" min={15} value={selectedNode.data.inputs.intervalSec ?? '60'} onChange={(event) => patch(selectedNode.id, { inputs: { ...selectedNode.data.inputs, intervalSec: event.target.value } })} />
                        </label>
                      ) : null}
                      {selectedFields.map((field) => (
                        <FieldEditor
                          key={field.key}
                          field={field}
                          value={selectedNode.data.inputs[field.key] ?? ''}
                          onChange={(value) => patch(selectedNode.id, { inputs: { ...selectedNode.data.inputs, [field.key]: value } })}
                          onFocus={() => setMappingTarget(field.key)}
                        />
                      ))}
                    </>
                  ) : null}

                  {(selectedNode.type === 'branch' || selectedNode.type === 'filter') ? (
                    <div className="space-y-3 rounded-xl p-3" style={{ background: 'var(--fill)' }}>
                      <div className="text-[12px] font-semibold">Condition</div>
                      <label className="block">
                        <span className="label">Left value</span>
                        <input className="input mt-1 font-mono text-[12px]" value={selectedNode.data.left} onChange={(event) => patch(selectedNode.id, { left: event.target.value })} placeholder="{{ trigger.statusContent }}" />
                      </label>
                      <label className="block">
                        <span className="label">Operator</span>
                        <select className="select mt-1" value={selectedNode.data.op} onChange={(event) => patch(selectedNode.id, { op: event.target.value as Condition['op'] })}>
                          {OPS.map((op) => <option key={op} value={op}>{op}</option>)}
                        </select>
                      </label>
                      <label className="block">
                        <span className="label">Right value</span>
                        <input className="input mt-1 font-mono text-[12px]" value={selectedNode.data.right} onChange={(event) => patch(selectedNode.id, { right: event.target.value })} />
                      </label>
                    </div>
                  ) : null}

                  {selectedNode.type === 'loop' ? (
                    <label className="block"><span className="label">Items expression</span><input className="input mt-1 font-mono text-[12px]" value={selectedNode.data.items} onChange={(event) => patch(selectedNode.id, { items: event.target.value })} /></label>
                  ) : null}
                  {selectedNode.type === 'delay' ? (
                    <label className="block"><span className="label">Delay (ms)</span><input className="input mt-1" type="number" min={0} value={selectedNode.data.forMs} onChange={(event) => patch(selectedNode.id, { forMs: event.target.value })} /></label>
                  ) : null}

                  {selectedNode.type !== 'trigger' ? (
                    <div className="border-t border-line pt-3">
                      <button type="button" className="btn btn-sm text-bad" onClick={() => removeNode(selectedNode.id)}><Icon name="trash" size={14} />Delete step</button>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {tab === 'data' ? (
                <div className="scroll flex-1 space-y-4 overflow-auto px-4 py-4" role="tabpanel">
                  <p className="text-[11.5px] leading-relaxed text-mute">Map an output from an earlier step into this step. Select an input field first, then click a value below.</p>
                  {mappingTarget ? (
                    <div className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-[11.5px]" style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}>
                      <span className="flex-1">Mapping into <strong>{mappingTarget}</strong></span>
                      <button type="button" className="underline" onClick={() => setMappingTarget(null)}>Cancel</button>
                    </div>
                  ) : null}
                  {upstream.length === 0 ? <p className="rounded-lg border border-dashed border-line p-3 text-[11.5px] text-mute">No earlier steps to map from.</p> : null}
                  {upstream.map((node) => {
                    const app = apps.find((item) => item.id === node.data.appId)
                    const outputs = node.type === 'trigger' ? app?.triggerOutputs[node.data.key] ?? [] : app?.actionOutputs[node.data.key] ?? []
                    return (
                      <div key={node.id} className="overflow-hidden rounded-lg border border-line">
                        <div className="flex items-center gap-2 px-2 py-1.5" style={{ background: 'var(--fill)' }}>
                          <span className="grid h-[17px] w-[17px] place-items-center rounded-[5px] bg-card text-[9.5px] font-semibold">{stepOf(node.id)}</span>
                          <ServiceMark id={node.data.appId} size={13} />
                          <span className="flex-1 truncate text-[11.5px] font-semibold">{node.data.name || KIND_LABEL[node.type ?? '']}</span>
                        </div>
                        {outputs.length === 0 ? <div className="border-t border-line px-2 py-2 text-[11px] text-faint">No declared outputs</div> : null}
                        {outputs.map((output) => (
                          <button
                            key={output.key}
                            type="button"
                            className="flex w-full items-center gap-1.5 border-t border-line px-2 py-1.5 text-left hover:bg-fill"
                            onClick={() => insertRef(`{{ ${node.id}.${output.key} }}`)}
                          >
                            <span className="flex-1 truncate text-[11.5px]">{output.label}</span>
                            <span className="pill !py-0 !px-1 !text-[9px] font-mono">{output.type}</span>
                            <span className="max-w-[76px] truncate font-mono text-[10px] text-faint">{output.key}</span>
                          </button>
                        ))}
                      </div>
                    )
                  })}
                </div>
              ) : null}

              {tab === 'output' ? (
                <div className="scroll flex-1 space-y-2 overflow-auto px-4 py-4" role="tabpanel">
                  <h3 className="text-[12px] font-semibold">Outputs</h3>
                  <p className="text-[11px] leading-relaxed text-mute">Reference these in later steps.</p>
                  {selectedOutputs.length === 0 ? <p className="rounded-lg border border-dashed border-line p-3 text-[11.5px] text-mute">This step does not declare outputs.</p> : null}
                  {selectedOutputs.map((output) => (
                    <div key={output.key} className="rounded-lg border border-line px-2.5 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className="flex-1 truncate text-[11.5px] font-semibold">{output.label}</span>
                        <span className="pill !py-0 !px-1 !text-[9px] font-mono">{output.type}</span>
                      </div>
                      <code className="mt-1 block truncate font-mono text-[10px] text-faint">{`{{ ${selectedNode.id}.${output.key} }}`}</code>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

export function BuilderRoute(props: {
  workflowId: string
  workflow: WorkflowResource | null
  apps: AppCatalogueEntry[]
  connections: ConnectionResource[]
}) {
  return (
    <ReactFlowProvider>
      <BuilderInner {...props} />
    </ReactFlowProvider>
  )
}
