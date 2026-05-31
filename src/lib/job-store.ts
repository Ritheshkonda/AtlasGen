import { PipelineJob, SSEEvent } from "@/types";

interface JobStoreState {
  jobs: Map<string, PipelineJob>;
  eventBuffers: Map<string, SSEEvent[]>;
  listeners: Map<string, Array<(event: SSEEvent) => void>>;
}

const globalStore = globalThis as typeof globalThis & {
  __atlasGenJobStore?: JobStoreState;
};

function state(): JobStoreState {
  if (!globalStore.__atlasGenJobStore) {
    globalStore.__atlasGenJobStore = {
      jobs: new Map(),
      eventBuffers: new Map(),
      listeners: new Map(),
    };
  }
  return globalStore.__atlasGenJobStore;
}

export class JobStore {
  /**
   * Initializes a new pipeline job entry.
   */
  public static createJob(jobId: string, prompt: string): PipelineJob {
    const job: PipelineJob = {
      jobId,
      prompt,
      status: "idle",
      currentStage: "none",
      errors: [],
      semanticErrors: [],
      repairLogs: [],
      latency: {},
      tokenCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    state().jobs.set(jobId, job);
    state().eventBuffers.set(jobId, []);
    state().listeners.set(jobId, []);
    return job;
  }

  /**
   * Fetches a job by ID.
   */
  public static getJob(jobId: string): PipelineJob | undefined {
    return state().jobs.get(jobId);
  }

  /**
   * Updates a job in the store and triggers state persistence hooks.
   */
  public static updateJob(jobId: string, updates: Partial<PipelineJob>): PipelineJob {
    const job = state().jobs.get(jobId);
    if (!job) {
      throw new Error(`Job '${jobId}' not found.`);
    }

    const updatedJob: PipelineJob = {
      ...job,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    state().jobs.set(jobId, updatedJob);
    return updatedJob;
  }

  /**
   * Retrieves all registered jobs.
   */
  public static getAllJobs(): PipelineJob[] {
    return Array.from(state().jobs.values());
  }

  /**
   * Records an SSE event into the job's buffer for replayability.
   * Broadcasts the event to any active listener clients.
   */
  public static emitSSEEvent(
    jobId: string,
    type: SSEEvent["type"],
    payload: unknown
  ): void {
    const buffer = state().eventBuffers.get(jobId) || [];
    const event: SSEEvent = {
      id: `${jobId}_${type}_${Date.now()}`,
      type,
      data: payload,
    };

    buffer.push(event);
    state().eventBuffers.set(jobId, buffer);

    // Dispatch to registered listeners
    const activeListeners = state().listeners.get(jobId) || [];
    activeListeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error(`Error dispatching SSE event for Job '${jobId}':`, err);
      }
    });
  }

  /**
   * Returns the array of buffered events to replay during client reconnects.
   */
  public static getSSEHistory(jobId: string): SSEEvent[] {
    return state().eventBuffers.get(jobId) || [];
  }

  /**
   * Registers a client listener callback to receive streaming updates.
   */
  public static addSSEListener(
    jobId: string,
    callback: (event: SSEEvent) => void
  ): void {
    const activeListeners = state().listeners.get(jobId) || [];
    activeListeners.push(callback);
    state().listeners.set(jobId, activeListeners);
  }

  /**
   * Removes a listener callback (e.g. on client socket disconnection).
   */
  public static removeSSEListener(
    jobId: string,
    callback: (event: SSEEvent) => void
  ): void {
    const activeListeners = state().listeners.get(jobId) || [];
    const filtered = activeListeners.filter((listener) => listener !== callback);
    state().listeners.set(jobId, filtered);
  }
}
