import {
  metrics,
  type Counter,
  type Gauge,
  type Histogram,
} from '@opentelemetry/api';

const meter = metrics.getMeter('surface-volume-backend', '1.0.0');

interface BackendMetrics {
  runs: Counter;
  stepsFinished: Counter;
  stepDuration: Histogram;
  queueWaiting: Gauge;
  queueActive: Gauge;
  queueDelayed: Gauge;
  queueEnqueued: Counter;
}

export const backendMetrics: BackendMetrics = {
  runs: meter.createCounter('workflow.runs', {
    description: 'Workflow runs that reached a terminal status',
  }),
  stepsFinished: meter.createCounter('workflow.steps.finished', {
    description: 'Workflow steps that finished (or were scheduled for retry)',
  }),
  stepDuration: meter.createHistogram('workflow.step.duration', {
    description: 'Time spent finishing a workflow step',
    unit: 's',
  }),
  queueWaiting: meter.createGauge('queue.jobs.waiting', {
    description: 'Jobs currently waiting in the workflow queue',
  }),
  queueActive: meter.createGauge('queue.jobs.active', {
    description: 'Jobs currently being processed',
  }),
  queueDelayed: meter.createGauge('queue.jobs.delayed', {
    description: 'Jobs scheduled for later',
  }),
  queueEnqueued: meter.createCounter('queue.jobs.enqueued', {
    description: 'Jobs added to the workflow queue',
  }),
};
