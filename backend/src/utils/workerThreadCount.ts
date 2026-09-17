import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';

/**
 * How many worker threads this process may run: the container's CPU allowance
 * when it has one, the machine's parallelism otherwise, and `WORKER_THREADS`
 * whenever the operator names a number.
 *
 * A cgroup does not virtualise `/proc/cpuinfo`, so `availableParallelism()`
 * reports the cores of the host rather than the quota this process is held to.
 * A pool sized by it spawns dozens of openchemlib workers where the limit
 * allows two, which reaches the memory limit and is killed before it has
 * answered anything.
 * @returns the thread count, at least one
 */
export function workerThreadCount(): number {
  const configured = Number(process.env.WORKER_THREADS);
  if (Number.isInteger(configured) && configured > 0) return configured;
  return cpuQuota() ?? availableParallelism();
}

/**
 * The CPU allowance of the cgroup this process runs in.
 * @returns the number of CPUs, or undefined outside a quota
 */
function cpuQuota(): number | undefined {
  // cgroup v2 writes "<quota> <period>", and "max <period>" when unlimited.
  const parts = readText('/sys/fs/cgroup/cpu.max')?.split(' ');
  if (parts?.length === 2 && parts[0] !== 'max') {
    return cpusOf(Number(parts[0]), Number(parts[1]));
  }
  // cgroup v1, where -1 is unlimited.
  const quota = Number(readText('/sys/fs/cgroup/cpu/cpu.cfs_quota_us'));
  const period = Number(readText('/sys/fs/cgroup/cpu/cpu.cfs_period_us'));
  return quota > 0 ? cpusOf(quota, period) : undefined;
}

/**
 * Turn a quota and a period into whole CPUs.
 * @param quota - the microseconds the cgroup may run per period
 * @param period - the length of the period, in microseconds
 * @returns the number of CPUs, or undefined when the pair makes no sense
 */
function cpusOf(quota: number, period: number): number | undefined {
  if (!Number.isFinite(quota) || !Number.isFinite(period) || period <= 0) {
    return undefined;
  }
  return Math.max(1, Math.ceil(quota / period));
}

/**
 * Read a cgroup file, which is absent on a machine that has no cgroups.
 * @param path - the file to read
 * @returns its contents, trimmed, or undefined when it cannot be read
 */
function readText(path: string): string | undefined {
  try {
    return readFileSync(path, 'utf8').trim();
  } catch {
    return undefined;
  }
}
