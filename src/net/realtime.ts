import { RealtimeClient, type RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './cloud';

/*
 * A line to the rooms server on Supabase Realtime, in place of a public MQTT server. relay.ts
 * works the same on both: it subscribes to topics, publishes messages, and keeps one "retained"
 * message per room code saying who holds it (the claim). Here:
 *   - a topic is a Realtime channel (its name: the topic with ':' for '/');
 *   - a message is a broadcast on that channel;
 *   - the claim is Presence on the claim channel: it is there while the host is connected and
 *     goes away by itself when the host drops (what MQTT's last will did).
 * Sending to a channel we don't listen on (the other phone's inbox) joins it once and keeps it.
 *
 * Protocol version 1.0.0 (plain JSON): supported by Supabase, and the same that our tests run
 * against a stand-in server.
 */

/** The line name relay.ts gets in its server list for this. */
export const SUPABASE_LINE = 'supabase';

const channelName = (topic: string) => topic.replace(/\//g, ':');
const isClaim = (topic: string) => topic.endsWith('/claim');

interface Claim {
  owner: string;
  inst: string;
  at: number;
}

interface Entry {
  ch: RealtimeChannel;
  /** We hear its messages (a topic we subscribed to), not only send on it. */
  listening: boolean;
  joined: boolean;
  /** Messages waiting for the join. */
  queue: string[];
  /** The claim to put up (or take down: null) once joined. */
  claim?: Claim | null;
}

export class RealtimeBus {
  ready = false;
  closed = false;
  onReady?: () => void;
  onClose?: () => void;
  onMessage?: (topic: string, payload: string) => void;
  onSubscribed?: (topic: string) => void;

  private client: RealtimeClient;
  private channels = new Map<string, Entry>();
  /** This connection's presence key. */
  private key = Math.random().toString(36).slice(2, 12);
  private timers: number[] = [];
  private checking?: number;

  constructor(opts: { timeout?: number } = {}) {
    if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error('Supabase is not set up');
    this.client = new RealtimeClient(`${SUPABASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/realtime/v1`, {
      params: { apikey: SUPABASE_KEY },
      vsn: '1.0.0',
      timeout: 8000,
      heartbeatIntervalMs: 15_000,
      // relay.ts reconnects (with its own backoff, and fresh channels): the client itself doesn't.
      reconnectAfterMs: () => 24 * 3600_000,
    });
    this.client.onHeartbeat((status) => {
      if (status === 'timeout' || status === 'error') this.close();
    });
    this.client.connect();
    const started = Date.now();
    const timeout = opts.timeout ?? 8000;
    const opening = window.setInterval(() => {
      if (this.closed) return window.clearInterval(opening);
      if (this.client.isConnected()) {
        window.clearInterval(opening);
        this.ready = true;
        this.onReady?.();
      } else if (Date.now() - started > timeout) {
        window.clearInterval(opening);
        this.close();
      }
    }, 50);
    // Gone without a word (server restart, network switch): relay.ts then opens a new line.
    const watch = window.setInterval(() => this.ready && !this.client.isConnected() && this.close(), 2000);
    this.timers.push(opening, watch);
  }

  subscribe(topic: string) {
    if (!this.ready) return;
    const known = this.channels.get(topic);
    if (known?.listening) return;
    if (known) this.drop(topic);
    this.open(topic, true);
  }

  publish(topic: string, payload: string, retain = false) {
    if (!this.ready) return false;
    if (retain) {
      // The claim: presence on its channel (subscribed before, see relay.ts).
      const e = this.channels.get(topic) ?? this.open(topic, true);
      let claim: Claim | null = null;
      try {
        claim = payload ? (JSON.parse(payload) as Claim) : null;
      } catch {
        return false;
      }
      e.claim = claim;
      if (e.joined) this.putClaim(e);
      return true;
    }
    const e = this.channels.get(topic) ?? this.open(topic, false);
    if (e.joined) void e.ch.send({ type: 'broadcast', event: 'm', payload: { p: payload } }).catch(() => {});
    else e.queue.push(payload);
    return true;
  }

  /** Make sure the line is still alive (after the phone slept): close it if no answer comes soon. */
  check() {
    if (!this.ready || this.checking) return;
    if (!this.client.isConnected()) return this.close();
    void this.client.sendHeartbeat();
    this.checking = window.setTimeout(() => {
      this.checking = undefined;
      if (this.client.pendingHeartbeatRef) this.close();
    }, 4000);
  }

  close() {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    this.timers.forEach((t) => window.clearInterval(t));
    window.clearTimeout(this.checking);
    const client = this.client;
    // Leave the channels first: our presence (a claim) goes away at once, not only when the server notices.
    const bye = Promise.race([client.removeAllChannels(), new Promise((done) => window.setTimeout(done, 1000))]);
    void bye.finally(() => client.disconnect()).catch(() => {});
    this.onClose?.();
  }

  private open(topic: string, listening: boolean): Entry {
    const ch = this.client.channel(channelName(topic), { config: { broadcast: { self: false, ack: false }, presence: { key: this.key } } });
    const e: Entry = { ch, listening, joined: false, queue: [] };
    this.channels.set(topic, e);
    if (listening) {
      ch.on('broadcast', { event: 'm' }, (msg: { payload?: { p?: unknown } }) => {
        const p = msg.payload?.p;
        if (typeof p === 'string') this.onMessage?.(topic, p);
      });
      if (isClaim(topic)) ch.on('presence', { event: 'sync' }, () => this.claimSeen(topic, ch));
    }
    ch.subscribe((status) => {
      if (this.closed || this.channels.get(topic) !== e) return;
      if (status === 'SUBSCRIBED') {
        if (e.joined) return;
        e.joined = true;
        for (const p of e.queue.splice(0)) void ch.send({ type: 'broadcast', event: 'm', payload: { p } }).catch(() => {});
        if (e.claim !== undefined) this.putClaim(e);
        if (listening) this.onSubscribed?.(topic);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        // A channel that fails takes the line with it: relay.ts starts over on a fresh one.
        this.close();
      }
    });
    return e;
  }

  private drop(topic: string) {
    const e = this.channels.get(topic);
    if (!e) return;
    this.channels.delete(topic);
    void this.client.removeChannel(e.ch).catch(() => {});
  }

  private putClaim(e: Entry) {
    const claim = e.claim;
    e.claim = undefined;
    void (claim ? e.ch.track({ ...claim }) : e.ch.untrack()).catch(() => {});
  }

  /** Who holds this room code now, as relay.ts reads a retained claim: the newest, or nobody (''). */
  private claimSeen(topic: string, ch: RealtimeChannel) {
    let best: Claim | null = null;
    for (const metas of Object.values(ch.presenceState())) {
      for (const m of metas as unknown as Partial<Claim>[]) {
        if (typeof m.owner === 'string' && typeof m.inst === 'string' && typeof m.at === 'number' && (!best || m.at > best.at)) {
          best = { owner: m.owner, inst: m.inst, at: m.at };
        }
      }
    }
    this.onMessage?.(topic, best ? JSON.stringify(best) : '');
  }
}
