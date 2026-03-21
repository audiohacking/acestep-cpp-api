import { config } from "./config";

/** Task status: 0 = queued/running, 1 = succeeded, 2 = failed */
export type TaskStatus = 0 | 1 | 2;

export interface TaskResultItem {
  file: string;
  wave: string;
  status: number;
  create_time: number;
  env: string;
  prompt: string;
  lyrics: string;
  metas: { bpm?: number; duration?: number; genres?: string; keyscale?: string; timesignature?: string };
  generation_info: string;
  seed_value: string;
  lm_model: string;
  dit_model: string;
}

export interface Task {
  task_id: string;
  status: TaskStatus;
  result?: string; // JSON string of TaskResultItem[]
  error?: string;
  queue_position?: number;
  created_at: number;
  /** Request body for worker (not serialized to client). */
  _body?: Record<string, unknown>;
}

const tasks = new Map<string, Task>();

export function createTask(taskId: string, queuePosition: number, body?: Record<string, unknown>): Task {
  const t: Task = {
    task_id: taskId,
    status: 0,
    created_at: Date.now(),
    queue_position: queuePosition,
    _body: body,
  };
  tasks.set(taskId, t);
  return t;
}

export function getTask(taskId: string): Task | undefined {
  return tasks.get(taskId);
}

export function getTasks(ids: string[]): Task[] {
  return ids.map((id) => tasks.get(id)).filter((t): t is Task => t != null);
}

export function setTaskResult(taskId: string, result: string) {
  const t = tasks.get(taskId);
  if (t) {
    t.status = 1;
    t.result = result;
    t.queue_position = undefined;
  }
}

export function setTaskFailed(taskId: string, error: string, resultJson?: string) {
  const t = tasks.get(taskId);
  if (t) {
    t.status = 2;
    t.error = error;
    t.result = resultJson;
    t.queue_position = undefined;
  }
}

const jobDurationsMs: number[] = [];

export function recordJobDuration(ms: number) {
  jobDurationsMs.push(ms);
  const w = config.avgJobWindow;
  while (jobDurationsMs.length > w) jobDurationsMs.shift();
}

export function avgJobSeconds(defaultSeconds: number): number {
  if (!jobDurationsMs.length) return defaultSeconds;
  const sum = jobDurationsMs.reduce((a, b) => a + b, 0);
  return Math.round((sum / jobDurationsMs.length / 1000) * 100) / 100;
}

export function taskCounts(): { total: number; queued: number; running: number; succeeded: number; failed: number } {
  let queued = 0,
    running = 0,
    succeeded = 0,
    failed = 0;
  for (const t of tasks.values()) {
    if (t.status === 0) {
      if (t.queue_position != null) queued++;
      else running++;
    } else if (t.status === 1) succeeded++;
    else failed++;
  }
  return {
    total: tasks.size,
    queued,
    running,
    succeeded,
    failed,
  };
}
