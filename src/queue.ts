import { config } from "./config";
import * as store from "./store";
import { runPipeline } from "./worker";

const queue: string[] = [];
let running = 0;

export function enqueue(taskId: string, body?: Record<string, unknown>): { ok: boolean; position?: number; error?: string } {
  if (queue.length + running >= config.queueMaxSize) {
    return { ok: false, error: "Queue full" };
  }
  const position = queue.length + 1;
  queue.push(taskId);
  store.createTask(taskId, position, body);
  queueMicrotask(consume);
  return { ok: true, position };
}

function consume() {
  while (running < config.queueWorkers && queue.length > 0) {
    const taskId = queue.shift()!;
    const t = store.getTask(taskId);
    if (!t || t.status !== 0) continue;
    t.queue_position = undefined; // now "running"
    running++;
    runPipeline(taskId).finally(() => {
      running--;
      consume();
    });
  }
}

export function queueSize() {
  return { queued: queue.length, running, maxSize: config.queueMaxSize };
}
