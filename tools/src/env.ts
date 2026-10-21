// Settings from the environment, read the way the bash scripts read them.

/** A setting, where empty counts as unset, like `${NAME:-fallback}`. */
export function envOr(env: NodeJS.ProcessEnv, name: string, fallback: string): string {
  const value = env[name];
  return value === undefined || value === '' ? fallback : value;
}

/** True when the setting is present and not empty. */
export function envSet(env: NodeJS.ProcessEnv, name: string): boolean {
  return envOr(env, name, '') !== '';
}

/** A non-negative integer setting, or the fallback when unset. Throws on
 *  anything that is not digits or is below `min`. */
export function envInt(env: NodeJS.ProcessEnv, name: string, fallback: number, min = 0): number {
  const raw = envOr(env, name, '');
  if (raw === '') return fallback;
  if (!/^[0-9]+$/u.test(raw) || Number(raw) < min) {
    throw new Error(`${name} must be ${min > 0 ? `>= ${min}` : 'a number'}`);
  }
  return Number(raw);
}
