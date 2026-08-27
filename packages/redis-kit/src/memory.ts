/**
 * In-memory Redis mock for local dev without Docker.
 * Implements only the subset of ioredis used by the codebase,
 * with best-effort semantics: caching and rate limiting degrade
 * gracefully, never throwing. Anything that needs real persistence
 * (leaderboards, SSE) simply operates in-memory per process.
 */
type PipelineOp = { cmd: string; args: unknown[] };

class MemoryPipeline {
  private ops: PipelineOp[] = [];
  constructor(private store: InMemoryRedis) {}

  call(command: string, ...args: unknown[]): this {
    this.ops.push({ cmd: command.toUpperCase(), args });
    return this;
  }
  hset(...args: unknown[]): this {
    this.ops.push({ cmd: "HSET", args });
    return this;
  }
  expire(...args: unknown[]): this {
    this.ops.push({ cmd: "EXPIRE", args });
    return this;
  }
  rpush(...args: unknown[]): this {
    this.ops.push({ cmd: "RPUSH", args });
    return this;
  }
  ltrim(...args: unknown[]): this {
    this.ops.push({ cmd: "LTRIM", args });
    return this;
  }
  publish(...args: unknown[]): this {
    this.ops.push({ cmd: "PUBLISH", args });
    return this;
  }

  async exec(): Promise<Array<[Error | null, unknown]>> {
    const results: Array<[Error | null, unknown]> = [];
    for (const { cmd, args } of this.ops) {
      try {
        let res: unknown = null;
        switch (cmd) {
          case "ZADD":
            res = await (this.store as any).zadd(...args);
            break;
          case "HSET": {
            const [key, field, value] = args as [string, string, string];
            // hset can be (key, field, value) or (key, object) - handle both
            if (args.length === 2 && typeof args[1] === "object") {
              const obj = args[1] as Record<string, string>;
              for (const [k, v] of Object.entries(obj)) await this.store.hset(args[0] as string, k, v);
              res = Object.keys(obj).length;
            } else {
              res = await this.store.hset(key, field, value);
            }
            break;
          }
          case "EXPIRE":
            res = await this.store.expire(args[0] as string, args[1] as number);
            break;
          case "RPUSH":
            res = await this.store.rpush(args[0] as string, ...(args.slice(1) as string[]));
            break;
          case "LTRIM":
            res = await this.store.ltrim(args[0] as string, args[1] as number, args[2] as number);
            break;
          case "PUBLISH":
            res = await this.store.publish(args[0] as string, args[1] as string);
            break;
          default:
            res = null;
        }
        results.push([null, res]);
      } catch (err) {
        results.push([err as Error, null]);
      }
    }
    return results;
  }
}

export class InMemoryRedis {
  private kv = new Map<string, { value: string; expAt?: number }>();
  private hashes = new Map<string, Map<string, string>>();
  private lists = new Map<string, string[]>();
  private zsets = new Map<string, Map<string, number>>();
  private expiry = new Map<string, NodeJS.Timeout>();

  private isExpired(key: string): boolean {
    const entry = this.kv.get(key);
    if (!entry?.expAt) return false;
    if (Date.now() > entry.expAt) {
      this.kv.delete(key);
      this.hashes.delete(key);
      this.lists.delete(key);
      return true;
    }
    return false;
  }

  // --- core string ops ---
  async get(key: string): Promise<string | null> {
    if (this.isExpired(key)) return null;
    return this.kv.get(key)?.value ?? null;
  }

  async getdel(key: string): Promise<string | null> {
    const v = await this.get(key);
    this.kv.delete(key);
    return v;
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<string> {
    // handle EX <seconds> and NX etc - we ignore NX semantics beyond best-effort
    let expAt: number | undefined;
    const exIdx = args.indexOf("EX");
    if (exIdx !== -1 && typeof args[exIdx + 1] === "number") {
      expAt = Date.now() + (args[exIdx + 1] as number) * 1000;
    }
    const pexIdx = args.indexOf("PX");
    if (pexIdx !== -1 && typeof args[pexIdx + 1] === "number") {
      expAt = Date.now() + (args[pexIdx + 1] as number);
    }
    // PEXPIRE variant
    const pexpireIdx = args.indexOf("PEXPIRE");
    if (pexIdx === -1 && pexpireIdx !== -1) { /* handled via expire() */ }

    // NX: only set if not exists
    if (args.includes("NX") && this.kv.has(key) && !this.isExpired(key)) {
      return null as unknown as string;
    }
    this.kv.set(key, { value, expAt });
    if (expAt) {
      const ttl = expAt - Date.now();
      if (ttl > 0) {
        const existing = this.expiry.get(key);
        if (existing) clearTimeout(existing);
        const t = setTimeout(() => this.kv.delete(key), ttl);
        // don't keep process alive
        (t as any).unref?.();
        this.expiry.set(key, t);
      }
    }
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let n = 0;
    for (const k of keys) {
      if (this.kv.delete(k)) n++;
      if (this.hashes.delete(k)) n++;
      if (this.lists.delete(k)) n++;
      if (this.zsets.delete(k)) n++;
    }
    return n;
  }

  async exists(key: string): Promise<number> {
    if (this.isExpired(key)) return 0;
    return this.kv.has(key) || this.hashes.has(key) || this.lists.has(key) || this.zsets.has(key) ? 1 : 0;
  }

  async expire(key: string, seconds: number): Promise<number> {
    const has = this.kv.has(key) || this.hashes.has(key) || this.lists.has(key) || this.zsets.has(key);
    if (!has) return 0;
    const expAt = Date.now() + seconds * 1000;
    const entry = this.kv.get(key);
    if (entry) entry.expAt = expAt;
    else this.kv.set(key, { value: "", expAt });
    const t = setTimeout(() => {
      this.kv.delete(key);
      this.hashes.delete(key);
      this.lists.delete(key);
      this.zsets.delete(key);
    }, seconds * 1000);
    (t as any).unref?.();
    return 1;
  }

  async eval(_script: string, numKeys: number, ...args: unknown[]): Promise<[number, number, number]> {
    // Rate limiting Lua: always allow for local dev
    // args: prevKey, currKey, limit, windowMs, now
    const limit = Number(args[2] ?? 600);
    return [1, 0, limit] as [number, number, number];
  }

  // --- hash ---
  async hgetall(key: string): Promise<Record<string, string>> {
    const m = this.hashes.get(key);
    if (!m) return {};
    const out: Record<string, string> = {};
    for (const [k, v] of m.entries()) out[k] = v;
    return out;
  }

  async hset(key: string, field: string, value: string): Promise<number> {
    let m = this.hashes.get(key);
    if (!m) {
      m = new Map();
      this.hashes.set(key, m);
    }
    const existed = m.has(field);
    m.set(field, value);
    return existed ? 0 : 1;
  }

  // --- list (SSE backlog) ---
  async rpush(key: string, ...values: string[]): Promise<number> {
    let arr = this.lists.get(key);
    if (!arr) {
      arr = [];
      this.lists.set(key, arr);
    }
    arr.push(...values);
    return arr.length;
  }

  async ltrim(key: string, start: number, stop: number): Promise<string> {
    const arr = this.lists.get(key);
    if (!arr) return "OK";
    // handle negative indices like Redis
    const len = arr.length;
    let s = start < 0 ? len + start : start;
    let e = stop < 0 ? len + stop : stop;
    s = Math.max(0, s);
    e = Math.min(len - 1, e);
    if (s > e) this.lists.set(key, []);
    else this.lists.set(key, arr.slice(s, e + 1));
    return "OK";
  }

  async lrange(key: string, start: number, stop: number): Promise<string[]> {
    const arr = this.lists.get(key) ?? [];
    const len = arr.length;
    let s = start < 0 ? len + start : start;
    let e = stop < 0 ? len + stop : stop;
    s = Math.max(0, s);
    e = Math.min(len - 1, e);
    if (s > e) return [];
    return arr.slice(s, e + 1);
  }

  // --- sorted sets (leaderboards) ---
  async zadd(key: string, ...args: unknown[]): Promise<number> {
    // Supports: ZADD key GT CH score member [score member ...]
    let m = this.zsets.get(key);
    if (!m) {
      m = new Map();
      this.zsets.set(key, m);
    }
    // filter out GT, CH flags
    const filtered: unknown[] = args.filter((a) => a !== "GT" && a !== "CH");
    // filtered is now [score, member, score, member ...]
    let added = 0;
    const gt = args.includes("GT");
    for (let i = 0; i < filtered.length; i += 2) {
      const score = Number(filtered[i]);
      const member = String(filtered[i + 1]);
      const existing = m.get(member);
      if (existing === undefined) {
        m.set(member, score);
        added++;
      } else {
        if (gt && score <= existing) continue; // GT means only greater
        m.set(member, score);
      }
    }
    return added;
  }

  async zrevrange(key: string, start: number, stop: number, withScores?: string): Promise<string[]> {
    const m = this.zsets.get(key);
    if (!m) return [];
    const entries = Array.from(m.entries()).sort((a, b) => b[1] - a[1]); // desc
    const len = entries.length;
    let s = start < 0 ? len + start : start;
    let e = stop < 0 ? len + stop : stop;
    s = Math.max(0, s);
    e = Math.min(len - 1, e);
    if (s > e) return [];
    const slice = entries.slice(s, e + 1);
    if (withScores === "WITHSCORES") {
      const out: string[] = [];
      for (const [member, score] of slice) {
        out.push(member, String(score));
      }
      return out;
    }
    return slice.map(([member]) => member);
  }

  // --- pub/sub (best-effort no-op for single process) ---
  private listeners = new Map<string, Array<(channel: string, msg: string) => void>>();
  // simple in-proc pubsub
  async publish(channel: string, message: string): Promise<number> {
    const cbs = this.listeners.get(channel) ?? [];
    // also broadcast wildcard? For local dev, just no-op fine
    for (const cb of cbs) cb(channel, message);
    // also deliver to 'message' listeners on duplicate clients
    return cbs.length;
  }
  async subscribe(...channels: string[]): Promise<void> {
    // subscribing is no-op; we just ensure listeners map exists
    for (const ch of channels) if (!this.listeners.has(ch)) this.listeners.set(ch, []);
  }
  async unsubscribe(...channels: string[]): Promise<void> {
    for (const ch of channels) this.listeners.delete(ch);
  }
  on(event: string, handler: (...args: any[]) => void): void {
    if (event === "message") {
      // store as generic listener; publish will invoke
      // For simplicity, treat first subscribed channel's listeners
      // This mock keeps it simple: global message handler
      const key = "__message__";
      const arr = this.listeners.get(key) ?? [];
      arr.push(handler as any);
      this.listeners.set(key, arr);
    }
  }
  // duplicate returns a new client sharing same underlying storage
  duplicate(): InMemoryRedis {
    // For local dev single-process SSE, sharing storage is correct
    return this;
  }
  disconnect(): void {}
  pipeline(): MemoryPipeline {
    return new MemoryPipeline(this);
  }

  // ioredis also has on/off for error etc - mock as no-op
  // Make this compatible with ioredis's `status` property etc.
  get status(): string {
    return "ready";
  }
}
