/** Logs anything slower than 300 ms as "[slow] label Nms" (Vercel → project → Logs). */
export async function timed<T>(label: string, fn: () => PromiseLike<T> | T): Promise<T> {
  const t0 = performance.now();
  try {
    return await fn();
  } finally {
    const ms = Math.round(performance.now() - t0);
    if (ms > 300 || process.env.PERF_LOG === "1") console.log(`[${ms > 300 ? "slow" : "perf"}] ${label} ${ms}ms`);
  }
}
