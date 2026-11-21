import { useCallback, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  addEdge,
  useNodesState,
  useEdgesState,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Topbar } from '@/components/Topbar'
import { Icon, type IconName } from '@/components/Icon'
import { ServiceMark } from '@/components/ServiceMark'
import { CATALOGUE } from '@/data/contract'
import { SERVICES, addWorkflow } from '@/data/mock'
import type {
  ActionNode,
  BranchNode,
  Condition,
  Link as WorkflowLink,
  LoopNode,
  WorkflowNode,
  WorkflowResource,
} from '@/data/contract'

type Data = {
  svc: string
  key: string
  left?: string
  op?: Op
  right?: string
  items?: string
  run?: 'ok' | 'bad' | 'run'
  onSvc?: (v: string) => void
  onKey?: (v: string) => void
  onField?: (f: string, v: string) => void
  onRemove?: () => void
  [key: string]: unknown
}

type Op = Condition['op']
const OPS: Op[] = ['eq', 'neq', 'gt', 'lt', 'contains', 'exists', 'not_exists', 'regex']

function newId(prefix: string) {
  return `${prefix}-${typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2)}`
}

function PaletteNode({ label, icon, onClick }: { label: string; icon: IconName; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl border border-line bg-fill px-3 py-2.5 text-left hover:border-accent hover:text-accent"
    >
      <Icon name={icon} size={16} />
      <span className="text-[12.5px] font-medium">{label}</span>
      <Icon name="plus" size={13} className="ml-auto" />
    </button>
  )
}

function TriggerCard({ data }: NodeProps<Node<Data>>) {
  const cat = CATALOGUE.find((c) => c.id === data.svc)
  return (
    <div className="w-[240px] rounded-2xl border-2 border-accent bg-card p-3 shadow-pop">
      <div className="mb-2 flex items-center gap-2">
        <ServiceMark id={data.svc} size={22} />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Trigger</span>
        {data.run ? <span className={`h-2.5 w-2.5 rounded-full ${data.run === 'ok' ? 'bg-ok' : data.run === 'bad' ? 'bg-bad' : 'bg-warn'}`} /> : null}
        <Handle type="source" position={Position.Right} id="out" className="!h-3 !w-3 !border-2 !border-card !bg-accent" />
      </div>
      <select className="input w-full" value={data.svc} onChange={(e) => data.onSvc?.(String(e.target.value))}>
        {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select className="input mt-2 w-full" value={data.key} onChange={(e) => data.onKey?.(String(e.target.value))}>
        {Object.keys(cat?.triggers ?? {}).map((k) => <option key={k} value={k}>{cat?.triggers[k] ?? k}</option>)}
      </select>
    </div>
  )
}

function ActionCard({ data }: NodeProps<Node<Data>>) {
  const cat = CATALOGUE.find((c) => c.id === data.svc)
  return (
    <div className="w-[240px] rounded-2xl border border-line bg-card p-3 shadow-card">
      <Handle type="target" position={Position.Left} id="in" className="!h-3 !w-3 !border-2 !border-card !bg-line-strong" />
      <div className="mb-2 flex items-center gap-2">
        <ServiceMark id={data.svc} size={22} />
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-mute">Action</span>
        {data.run ? <span className={`h-2.5 w-2.5 rounded-full ${data.run === 'ok' ? 'bg-ok' : data.run === 'bad' ? 'bg-bad' : 'bg-warn'}`} /> : null}
        <button type="button" className="btn btn-ghost btn-icon btn-sm ml-auto" onClick={() => data.onRemove?.()} aria-label="Remove step">
          <Icon name="x" size={13} />
        </button>
        <Handle type="source" position={Position.Right} id="out" className="!h-3 !w-3 !border-2 !border-card !bg-accent" />
      </div>
      <select className="input w-full" value={data.svc} onChange={(e) => data.onSvc?.(String(e.target.value))}>
        {SERVICES.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <select className="input mt-2 w-full" value={data.key} onChange={(e) => data.onKey?.(String(e.target.value))}>
        {Object.keys(cat?.actions ?? {}).map((k) => <option key={k} value={k}>{cat?.actions[k] ?? k}</option>)}
      </select>
    </div>
  )
}

function ConditionCard({ data }: NodeProps<Node<Data>>) {
  return (
    <div className="w-[250px] rounded-2xl border border-warn bg-card p-3 shadow-card">
      <Handle type="target" position={Position.Left} id="in" className="!h-3 !w-3 !border-2 !border-card !bg-line-strong" />
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-warn-soft text-warn"><Icon name="branch" size={13} /></span>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-warn">If</span>
        {data.run ? <span className={`h-2.5 w-2.5 rounded-full ${data.run === 'ok' ? 'bg-ok' : data.run === 'bad' ? 'bg-bad' : 'bg-warn'}`} /> : null}
        <button type="button" className="btn btn-ghost btn-icon btn-sm ml-auto" onClick={() => data.onRemove?.()} aria-label="Remove step">
          <Icon name="x" size={13} />
        </button>
      </div>
      <div className="flex gap-1.5">
        <input className="input w-full" placeholder="value" value={data.left ?? ''} onChange={(e) => data.onField?.('left', e.target.value)} />
        <select className="input w-[80px]" value={data.op ?? 'gt'} onChange={(e) => data.onField?.('op', e.target.value)}>
          {OPS.map((op) => <option key={op} value={op}>{op}</option>)}
        </select>
      </div>
      <input className="input mt-1.5 w-full" placeholder="compare to" value={data.right ?? ''} onChange={(e) => data.onField?.('right', e.target.value)} />
      <div className="mt-2 flex justify-between text-[10px] font-semibold">
        <span className="text-yes">YES <Handle type="source" position={Position.Bottom} id="yes" className="!left-6 !h-3 !w-3 !border-2 !border-card !bg-yes" /></span>
        <span className="text-no">NO <Handle type="source" position={Position.Bottom} id="no" className="!right-6 !h-3 !w-3 !border-2 !border-card !bg-no" /></span>
      </div>
    </div>
  )
}

function LoopCard({ data }: NodeProps<Node<Data>>) {
  return (
    <div className="w-[240px] rounded-2xl border border-ok bg-card p-3 shadow-card">
      <Handle type="target" position={Position.Left} id="in" className="!h-3 !w-3 !border-2 !border-card !bg-line-strong" />
      <div className="mb-2 flex items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-ok-soft text-ok"><Icon name="refresh" size={13} /></span>
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ok">Loop</span>
        {data.run ? <span className={`h-2.5 w-2.5 rounded-full ${data.run === 'ok' ? 'bg-ok' : data.run === 'bad' ? 'bg-bad' : 'bg-warn'}`} /> : null}
        <button type="button" className="btn btn-ghost btn-icon btn-sm ml-auto" onClick={() => data.onRemove?.()} aria-label="Remove step">
          <Icon name="x" size={13} />
        </button>
        <Handle type="source" position={Position.Right} id="out" className="!h-3 !w-3 !border-2 !border-card !bg-ok" />
      </div>
      <input className="input w-full" placeholder="items expression" value={data.items ?? ''} onChange={(e) => data.onField?.('items', e.target.value)} />
    </div>
  )
}

const nodeTypes = { trigger: TriggerCard, action: ActionCard, condition: ConditionCard, loop: LoopCard }

export function BuilderRoute({ workflowId }: { workflowId?: string }) {
  const [name, setName] = useState(workflowId === 'new' ? 'New workflow' : 'Workflow')
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [runStatus, setRunStatus] = useState<Record<string, 'ok' | 'bad' | 'run'>>({})
  const [runMessage, setRunMessage] = useState<string | null>(null)

  const [nodes, setNodes, onNodesChange] = useNodesState<Node<Data>>([
    { id: 'trigger', type: 'trigger', position: { x: 80, y: 120 }, data: { svc: SERVICES[0]?.id ?? 'webhook', key: '', onSvc: () => {}, onKey: () => {} } },
  ])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  const removeNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id))
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id))
  }, [setNodes, setEdges])

  const wire = useCallback((id: string, field: string, value: unknown) => {
    setNodes((nds) => nds.map((n) => n.id === id ? { ...n, data: { ...n.data, [field]: value } } : n))
  }, [setNodes])

  const nodesWithData = useMemo(() => nodes.map((n) => ({
    ...n,
    data: {
      ...n.data,
      onSvc: (v: string) => wire(n.id, 'svc', v),
      onKey: (v: string) => wire(n.id, 'key', v),
      onField: (f: string, v: string) => wire(n.id, f, v),
      onRemove: () => removeNode(n.id),
      run: runStatus[n.id],
    },
  })), [nodes, wire, removeNode, runStatus])

  const onConnect = useCallback((c: Connection) => setEdges((eds) => addEdge(c, eds)), [setEdges])

  function addNode(type: 'action' | 'condition' | 'loop', offset = 0) {
    const last = nodes[nodes.length - 1]
    const id = newId(type)
    const data: Data = type === 'condition'
      ? { svc: 'webhook', key: '', left: '', op: 'gt', right: '' }
      : type === 'loop'
        ? { svc: 'webhook', key: '', items: '' }
        : { svc: SERVICES[0]?.id ?? 'webhook', key: '' }
    setNodes((nds) => [...nds, { id, type, position: { x: (last?.position.x ?? 80) + 300 + offset, y: (last?.position.y ?? 120) }, data }])
    setPaletteOpen(false)
  }

  function runTest() {
    if (running) return
    setRunning(true)
    setRunStatus({})
    setRunMessage('Starting test run…')

    const order: string[] = []
    const seen = new Set<string>()
    let current = 'trigger'
    while (current && !seen.has(current)) {
      seen.add(current)
      order.push(current)
      const outgoing = edges.filter((e) => e.source === current)
      const next = outgoing.find((e) => e.sourceHandle === 'yes') ?? outgoing[0]
      current = next?.to ?? ''
    }

    if (order.length <= 1) {
      setRunStatus({ trigger: 'bad' })
      setRunMessage('No steps connected yet')
      setRunning(false)
      return
    }

    let i = 0
    const step = () => {
      if (i >= order.length) {
        setRunMessage('Test run succeeded')
        setRunning(false)
        return
      }
      const id = order[i]
      setRunStatus((prev) => ({ ...prev, [id]: 'run' }))
      window.setTimeout(() => {
        setRunStatus((prev) => ({ ...prev, [id]: 'ok' }))
        i += 1
        step()
      }, 350)
    }
    window.setTimeout(step, 200)
  }

  function save() {
    const trigger = nodes.find((n) => n.type === 'trigger')
    if (!trigger) return
    const tdata = trigger.data

    const graphNodes: WorkflowNode[] = nodes.filter((n) => n.type !== 'trigger').map((n) => {
      const d = n.data
      if (n.type === 'condition') {
        const cond: Condition = { left: d.left || 'value', op: d.op ?? 'gt', right: d.right || '' }
        return { type: 'branch', id: n.id, paths: [{ name: 'yes', conditions: [[cond]] }, { name: 'no', conditions: [] }] } as BranchNode
      }
      if (n.type === 'loop') {
        return { type: 'loop', id: n.id, items: d.items || '' } as LoopNode
      }
      const cat = CATALOGUE.find((c) => c.id === d.svc)
      return {
        type: 'action',
        id: n.id,
        appId: d.svc,
        actionKey: d.key || Object.keys(cat?.actions ?? {})[0] || 'call',
        inputs: {},
      } as ActionNode
    })

    const links: WorkflowLink[] = edges.map((e, i) => ({
      id: `l${i}`,
      from: e.source,
      fromPath: e.sourceHandle && e.sourceHandle !== 'out' ? e.sourceHandle : undefined,
      to: e.target,
    }))

    const now = new Date().toISOString()
    const resource: WorkflowResource = {
      id: newId('wf'),
      userId: 'me',
      name: name.trim() || 'Untitled workflow',
      description: null,
      status: 'draft',
      statusReason: null,
      version: 1,
      trigger: {
        id: 'trigger',
        appId: tdata.svc,
        triggerKey: tdata.key || Object.keys(CATALOGUE.find((c) => c.id === tdata.svc)?.triggers ?? {})[0] || 'incoming',
        inputs: {},
      },
      nodes: graphNodes,
      links,
      createdAt: now,
      updatedAt: now,
      lastRunAt: null,
    }
    addWorkflow({
      workflow: resource,
      services: [tdata.svc, ...new Set(nodes.filter((n) => n.type === 'action').map((n) => n.data.svc))],
      lastRun: null,
      runsLast7Days: [0, 0, 0, 0, 0, 0, 0],
    })
    window.location.href = '/'
  }

  return (
    <div className="flex h-full flex-col">
      <Topbar
        title={workflowId === 'new' ? 'New workflow' : 'Workflow'}
        subtitle="Drag nodes. Pull a port to another node to link them."
      >
        <a href="/" className="btn btn-quiet btn-sm">Cancel</a>
        <button type="button" className="btn btn-sm" onClick={runTest} disabled={running}>
          <Icon name="play" size={13} />
          {running ? 'Running…' : 'Play'}
        </button>
        <button type="button" className="btn btn-sm" onClick={() => setPaletteOpen((v) => !v)}>Add step</button>
        <button type="button" className="btn btn-accent btn-sm" onClick={save}>Save</button>
      </Topbar>

      <div className="flex min-h-0 flex-1 gap-3 p-4">
        <aside className="hidden w-[220px] shrink-0 flex-col overflow-auto rounded-2xl border border-line bg-card p-2 lg:flex">
          <div className="px-2 pt-1 pb-2 text-[12px] font-semibold">Steps</div>
          {nodes.map((n, i) => (
            <button key={n.id} type="button" onClick={() => setNodes((nds) => nds.map((x) => ({ ...x, selected: x.id === n.id })))} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[12px] hover:bg-fill">
              <span className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] bg-fill text-[10px] font-semibold text-mute">{i + 1}</span>
              <span className="truncate flex-1">{n.type === 'trigger' ? 'Trigger' : n.type === 'condition' ? 'If' : n.type === 'loop' ? 'Loop' : 'Action'}</span>
            </button>
          ))}
        </aside>

        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} className="input w-full max-w-md" placeholder="Workflow name" />
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-line bg-sunken">
            <ReactFlow
              nodes={nodesWithData}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              fitView
              defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: 'var(--line-strong)', strokeWidth: 1.8 } }}
            >
              <Background gap={20} size={1.2} color="var(--line)" />
              <Controls showInteractive={false} />
              <MiniMap nodeColor={() => 'var(--accent)'} maskColor="rgba(0,0,0,0.08)" />
            </ReactFlow>

            {paletteOpen ? (
              <div className="absolute left-3 top-3 z-30 w-[240px] space-y-1.5 rounded-2xl border border-line bg-card p-2 shadow-pop">
                <div className="px-1 pb-1 text-[11px] font-semibold text-mute">Add a step</div>
                <PaletteNode label="Action" icon="bolt" onClick={() => addNode('action')} />
                <PaletteNode label="If / condition" icon="branch" onClick={() => addNode('condition')} />
                <PaletteNode label="Loop" icon="refresh" onClick={() => addNode('loop')} />
              </div>
            ) : null}

            <div className="absolute bottom-3 left-3 z-20 rounded-xl border border-line bg-card px-2.5 py-1.5 text-[10.5px] text-mute shadow-card">
              Drag from a node's right port to another node's left port to link.
            </div>

            {runMessage ? (
              <div className="absolute bottom-3 left-1/2 z-30 -translate-x-1/2 rounded-xl border border-line bg-card px-4 py-2 text-[12px] font-medium shadow-pop">
                {runMessage}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
