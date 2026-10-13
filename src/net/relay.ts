/*
 * Phones in a room talk through public MQTT servers: each phone keeps a connection to the
 * servers and messages are passed along by them. Unlike a direct phone-to-phone link this
 * works whatever network each phone is on (two different Wi-Fis, mobile data, …).
 *
 * The shape follows PeerJS (a Peer with an id, connections with open/data/close), which the
 * room code was first built on.
 */

import { Mqtt } from './mqtt';

/** Each phone connects to all of these, so the room keeps working if one of them is down. */
const DEFAULT_SERVERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://broker.emqx.io:8084/mqtt'];
const PREFIX = 'prost-drinking-games/rooms/v1';
const inbox = (id: string) => `${PREFIX}/${id}/in`;
const claimTopic = (id: string) => `${PREFIX}/${id}/claim`;
const idFromClaim = (topic: string) => topic.slice(PREFIX.length + 1, -'/claim'.length);

/** Knock again this often until the other phone answers. */
const KNOCK_MS = 1500;
/** Say "still here" this often on an open connection… */
const PING_MS = 4000;
/** …ask the servers whether our own line still works after this long without a word… */
const QUIET_MS = 6000;
/** …and treat it as gone after this long. */
const SILENT_MS = 13_000;
/** How long the server gets to hand over who holds an id (it does so right after subscribing). */
const CLAIM_WAIT_MS = 1200;
/** The host renews its claim this often; an older one from another phone no longer counts. */
const CLAIM_RENEW_MS = 20_000;
const CLAIM_STALE_MS = 5 * 60_000;
const RETRY_MS = [1000, 2000, 4000, 8000];

type Kind = 'hi' | 'ok' | 'd' | 'p' | 'bye';
interface Envelope {
  /** Connection id */
  c: string;
  /** Sender's peer id */
  f: string;
  k: Kind;
  d?: unknown;
}
interface Claim {
  owner: string;
  inst: string;
  at: number;
}

export interface PeerError {
  type: 'unavailable-id' | 'peer-unavailable' | 'network';
}

export interface PeerOptions {
  /** A fixed id to be reachable at (the host); guests get a random one. */
  id?: string;
  /** Who this phone is: the same phone may take its id back right away (after a reload). */
  owner?: string;
  servers?: string[];
}

const randomId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

type Handler = (...args: any[]) => void;
class Emitter<E extends Record<string, unknown[]>> {
  private handlers = new Map<keyof E, Set<Handler>>();
  on<K extends keyof E>(event: K, fn: (...args: E[K]) => void) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(fn);
    return this;
  }
  protected emit<K extends keyof E>(event: K, ...args: E[K]) {
    this.handlers.get(event)?.forEach((fn) => fn(...args));
  }
}

export class DataConnection extends Emitter<{ open: []; data: [unknown]; close: [] }> {
  open = false;
  closed = false;
  heard = Date.now();
  /** The server this connection's messages go out on. */
  line: Line | null = null;
  knocking?: number;

  constructor(
    private peer: Peer,
    readonly id: string,
    readonly remote: string,
  ) {
    super();
  }

  send(data: unknown) {
    if (this.open) this.peer.sendOn(this, 'd', data);
  }

  close() {
    if (this.closed) return;
    if (this.open) this.peer.sendOn(this, 'bye');
    this.end();
  }

  /** @internal */
  end() {
    if (this.closed) return;
    this.closed = true;
    this.open = false;
    window.clearInterval(this.knocking);
    this.peer.forget(this);
    this.emit('close');
  }

  /** @internal */
  opened(line: Line) {
    if (this.open || this.closed) return;
    this.open = true;
    this.line = line;
    this.heard = Date.now();
    window.clearInterval(this.knocking);
    this.emit('open');
  }

  /** @internal */
  receive(data: unknown) {
    this.emit('data', data);
  }
}

/** One server connection. */
interface Line {
  url: string;
  mq: Mqtt | null;
  /** Subscribed to our inbox (and, for the host, holding the id). */
  ready: boolean;
  inbox: boolean;
  claimed: boolean;
  /** Who holds which id, as this server says. */
  claims: Map<string, Claim | null>;
  /** Ids whose holder this server has told us (or had the chance to). */
  checked: Set<string>;
  watching: Set<string>;
  failures: number;
  everReady: boolean;
  retry?: number;
}

export class Peer extends Emitter<{ open: [string]; connection: [DataConnection]; disconnected: []; error: [PeerError] }> {
  readonly id: string;
  open = false;
  destroyed = false;
  disconnected = false;

  private listening: boolean;
  private owner: string;
  private inst = randomId();
  private lines: Line[];
  private conns = new Map<string, DataConnection>();
  /** Connections that ended: late messages for them are ignored. */
  private gone = new Set<string>();
  private targets = new Set<string>();
  private everOpen = false;
  private failed = false;
  private timers: number[] = [];

  constructor(opts: PeerOptions = {}) {
    super();
    this.listening = !!opts.id;
    this.id = opts.id ?? `g-${randomId()}`;
    this.owner = opts.owner ?? this.inst;
    const servers = opts.servers?.length ? opts.servers : DEFAULT_SERVERS;
    this.lines = servers.map((url) => ({
      url,
      mq: null,
      ready: false,
      inbox: false,
      claimed: false,
      claims: new Map(),
      checked: new Set(),
      watching: new Set(),
      failures: 0,
      everReady: false,
    }));
    this.timers.push(window.setInterval(() => this.heartbeat(), PING_MS));
    if (this.listening) this.timers.push(window.setInterval(() => this.lines.forEach((l) => l.claimed && this.claim(l)), CLAIM_RENEW_MS));
    document.addEventListener('visibilitychange', this.onVisible);
    window.addEventListener('online', this.onOnline);
    // Connect after the caller had the chance to listen for 'open'.
    window.setTimeout(() => this.lines.forEach((l) => this.connectLine(l)), 0);
  }

  connect(target: string): DataConnection {
    const conn = new DataConnection(this, randomId(), target);
    this.conns.set(conn.id, conn);
    this.targets.add(target);
    for (const l of this.lines) this.watch(l, target);
    const knock = () => {
      if (conn.open || conn.closed) return;
      for (const l of this.lines) if (l.ready) this.post(l, target, { c: conn.id, f: this.id, k: 'hi' });
    };
    window.setTimeout(knock, 0);
    conn.knocking = window.setInterval(knock, KNOCK_MS);
    window.setTimeout(() => this.checkTarget(target), 0);
    return conn;
  }

  /** Try the servers again right away. */
  reconnect() {
    if (this.destroyed) return;
    for (const l of this.lines) {
      if (l.mq) continue;
      window.clearTimeout(l.retry);
      this.connectLine(l);
    }
  }

  destroy() {
    if (this.destroyed) return;
    [...this.conns.values()].forEach((c) => c.close());
    this.destroyed = true;
    this.open = false;
    this.timers.forEach((t) => window.clearInterval(t));
    document.removeEventListener('visibilitychange', this.onVisible);
    window.removeEventListener('online', this.onOnline);
    for (const l of this.lines) {
      window.clearTimeout(l.retry);
      // Give the id free for the next room.
      if (l.claimed) l.mq?.publish(claimTopic(this.id), '', true);
      l.mq?.close();
    }
  }

  /** @internal */
  sendOn(conn: DataConnection, k: Kind, d?: unknown) {
    const line = conn.line?.ready ? conn.line : this.lines.find((l) => l.ready);
    if (line) this.post(line, conn.remote, { c: conn.id, f: this.id, k, d });
  }

  /** @internal */
  forget(conn: DataConnection) {
    this.conns.delete(conn.id);
    this.gone.add(conn.id);
  }

  private onVisible = () => {
    if (document.visibilityState !== 'visible') return;
    // Back from sleep: the connections may have died meanwhile without anyone noticing.
    this.lines.forEach((l) => l.mq?.check());
    this.reconnect();
  };

  /** The network is back (out of a dead spot, Wi-Fi ↔ mobile data): don't wait for the next retry. */
  private onOnline = () => {
    this.lines.forEach((l) => {
      l.failures = 0;
      l.mq?.check();
    });
    this.reconnect();
  };

  private post(line: Line, to: string, env: Envelope) {
    line.mq?.publish(inbox(to), JSON.stringify(env));
  }

  private connectLine(line: Line) {
    if (this.destroyed || line.mq) return;
    const mq = new Mqtt({
      url: line.url,
      // Dropped without a goodbye: the server frees our id for us.
      will: this.listening ? { topic: claimTopic(this.id), payload: '', retain: true } : undefined,
    });
    line.mq = mq;
    mq.onReady = () => {
      mq.subscribe(inbox(this.id));
      if (this.listening) mq.subscribe(claimTopic(this.id));
      line.watching.clear();
      for (const t of this.targets) this.watch(line, t);
    };
    mq.onSubscribed = (topic) => {
      if (topic === inbox(this.id)) {
        line.inbox = true;
        this.lineUp(line);
      } else if (topic === claimTopic(this.id)) {
        window.setTimeout(() => {
          if (line.mq !== mq || this.destroyed) return;
          const c = line.claims.get(this.id);
          if (c && c.owner !== this.owner && Date.now() - c.at < CLAIM_STALE_MS) {
            this.fail({ type: 'unavailable-id' });
            return;
          }
          this.claim(line);
          this.lineUp(line);
        }, CLAIM_WAIT_MS);
      } else {
        const target = idFromClaim(topic);
        window.setTimeout(() => {
          if (line.mq !== mq) return;
          line.checked.add(target);
          this.checkTarget(target);
        }, CLAIM_WAIT_MS);
      }
    };
    mq.onMessage = (topic, payload) => {
      if (topic === inbox(this.id)) {
        let env: Envelope;
        try {
          env = JSON.parse(payload) as Envelope;
        } catch {
          return;
        }
        this.receive(line, env);
        return;
      }
      if (!topic.endsWith('/claim')) return;
      const id = idFromClaim(topic);
      let claim: Claim | null = null;
      try {
        claim = payload ? (JSON.parse(payload) as Claim) : null;
      } catch {
        /* not ours */
      }
      line.claims.set(id, claim);
      // Our own claim got cleared (an old connection of ours said goodbye late): take it back.
      if (id === this.id && line.claimed && claim?.inst !== this.inst) this.claim(line);
    };
    mq.onClose = () => {
      if (line.mq !== mq) return;
      line.mq = null;
      const wasReady = line.ready;
      line.ready = line.inbox = line.claimed = false;
      line.claims.clear();
      line.checked.clear();
      line.watching.clear();
      if (!wasReady) line.failures++;
      // Connections that went out on this server can't reach the other phone any more.
      for (const c of [...this.conns.values()]) if (c.open && c.line === line) c.end();
      if (this.destroyed) return;
      this.update();
      if (!this.everOpen && this.lines.every((l) => l.failures > 0 && !l.mq)) {
        this.fail({ type: 'network' });
        return;
      }
      line.retry = window.setTimeout(() => this.connectLine(line), RETRY_MS[Math.min(line.failures, RETRY_MS.length - 1)]);
    };
  }

  private watch(line: Line, target: string) {
    if (!line.mq?.ready || line.watching.has(target)) return;
    line.watching.add(target);
    line.mq.subscribe(claimTopic(target));
  }

  private claim(line: Line) {
    line.claimed = true;
    const claim: Claim = { owner: this.owner, inst: this.inst, at: Date.now() };
    line.mq?.publish(claimTopic(this.id), JSON.stringify(claim), true);
  }

  private lineUp(line: Line) {
    if (line.ready || !line.inbox || (this.listening && !line.claimed)) return;
    line.ready = true;
    line.everReady = true;
    line.failures = 0;
    this.update();
  }

  private update() {
    const up = this.lines.some((l) => l.ready);
    if (up && !this.open) {
      this.open = true;
      this.disconnected = false;
      this.everOpen = true;
      this.emit('open', this.id);
    } else if (!up && this.open) {
      this.open = false;
      this.disconnected = true;
      this.emit('disconnected');
    }
  }

  private fail(err: PeerError) {
    if (this.failed || this.destroyed) return;
    this.failed = true;
    this.emit('error', err);
  }

  /** Nobody holds the id we're knocking at (as far as every server we're on says): no such room. */
  private checkTarget(target: string) {
    const waiting = [...this.conns.values()].filter((c) => c.remote === target && !c.open && !c.closed);
    if (!waiting.length) return;
    const up = this.lines.filter((l) => l.ready);
    if (!up.length || !up.every((l) => l.checked.has(target))) return;
    if (up.some((l) => l.claims.get(target))) return;
    waiting.forEach((c) => c.end());
    this.emit('error', { type: 'peer-unavailable' });
  }

  private receive(line: Line, env: Envelope) {
    if (!env || typeof env.c !== 'string' || typeof env.f !== 'string') return;
    let conn = this.conns.get(env.c);
    if (env.k === 'bye') {
      conn?.end();
      return;
    }
    if (env.k === 'hi') {
      if (!this.listening || this.gone.has(env.c)) return;
      if (!conn) {
        conn = new DataConnection(this, env.c, env.f);
        this.conns.set(conn.id, conn);
        this.emit('connection', conn);
        conn.opened(line);
      }
      conn.heard = Date.now();
      this.post(line, env.f, { c: env.c, f: this.id, k: 'ok' });
      return;
    }
    if (env.k === 'ok') {
      conn?.opened(line);
      return;
    }
    // Data or "still here" on a connection we don't have (any more): tell the other side.
    if (!conn?.open) {
      this.post(line, env.f, { c: env.c, f: this.id, k: 'bye' });
      return;
    }
    conn.heard = Date.now();
    if (env.k === 'd') conn.receive(env.d);
  }

  private heartbeat() {
    const now = Date.now();
    for (const c of [...this.conns.values()]) {
      if (!c.open) continue;
      if (now - c.heard > SILENT_MS) c.close();
      else {
        // Maybe it's our own connection that died without a sound (switched networks on the
        // road): find out now, and a dead one is replaced before the other phone counts as gone.
        if (now - c.heard > QUIET_MS) this.lines.forEach((l) => l.mq?.check());
        this.sendOn(c, 'p');
      }
    }
  }
}
