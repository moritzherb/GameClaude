import { RealtimeClient, type RealtimeChannel } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './cloud';

/*
 * A line to the rooms server on Supabase Realtime, in place of a public MQTT server. relay.ts
 * works the same on both: it subscribes to topics, publishes messages, and keeps one "retained"
 * message per room code saying who holds it (the claim). Here:
 *   - a topic is a Realtime channel (its name: the topic with ':' for '/');
 *   - the claim is Presence on the claim channel: there while the host is connected, gone by
 *     itself when the host drops (what MQTT's last will did);
 *   - a message to another phone's inbox: on Realtime everyone in a channel gets everything in it,
 *     so we don't join the other phone's inbox (we'd get every message the others send there, and
 *     pay for each). The first messages go in by REST; meanwhile both phones join a channel of
 *     their own, just the two of them, and once both are in, everything goes through that.
 *
 * Protocol version 1.0.0 (plain JSON): supported by Supabase, and the same that our tests run
 * against a stand-in server.
 */

/** The line name relay.ts gets in its server list for this. */
export const SUPABASE_LINE = 'supabase';

const channelName = (topic: string) => topic.replace(/\//g, ':');
const isClaim = (topic: string) => topic.endsWith('/claim');
/** The phone id in an inbox topic (relay.ts: `…/<id>/in`). */
const inboxId = (topic: string) => /\/([^/]+)\/in$/.exec(topic)?.[1] ?? null;
/** A pair channel nobody else is in any more goes after this long. */
const PAIR_IDLE_MS = 30_000;

interface Claim {
  owner: string;
  inst: string;
  at: number;
}

/** A topic we listen on (our inbox, claims). */
interface Entry {
  ch: RealtimeChannel;
  joined: boolean;
  /** The claim to put up (or take down: null) once joined. */
  claim?: Claim | null;
}

/** The channel of just us two, for one other phone (by its inbox topic). */
interface Pair {
  ch: RealtimeChannel;
  joined: boolean;
  /** The other phone is in it too. */
  here: boolean;
  wasHere: boolean;
  /** Our messages to it still on their way by REST (the pair takes over only after them, in order). */
  sending: number;
  queue: string[];
  idle?: number;
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
  private pairs = new Map<string, Pair>();
  private rest = new Map<string, RealtimeChannel>();
  /** Our own inbox topic (the first one relay.ts subscribes to). */
  private inbox: string | null = null;
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
    if (!this.ready || this.channels.has(topic)) return;
    if (!this.inbox && inboxId(topic)) this.inbox = topic;
    this.listen(topic);
  }

  publish(topic: string, payload: string, retain = false) {
    if (!this.ready) return false;
    if (retain) {
      // The claim: presence on its channel (subscribed before, see relay.ts).
      const e = this.channels.get(topic) ?? this.listen(topic);
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
    // Another phone's inbox: through our pair channel once it's up, else by REST.
    const pair = this.pairWith(topic);
    if (!pair) return this.restSend(topic, payload);
    if (pair.joined && pair.here) {
      if (pair.sending || pair.queue.length) pair.queue.push(payload);
      else this.pairSend(pair, payload);
    } else {
      pair.sending++;
      this.restSend(topic, payload, () => {
        pair.sending--;
        this.flush(pair);
      });
    }
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
    for (const p of this.pairs.values()) window.clearTimeout(p.idle);
    const client = this.client;
    // Leave the channels first: our presence (a claim) goes away at once, not only when the server notices.
    const bye = Promise.race([client.removeAllChannels(), new Promise((done) => window.setTimeout(done, 1000))]);
    void bye.finally(() => client.disconnect()).catch(() => {});
    this.onClose?.();
  }

  /* ---------- Channels we listen on ---------- */

  private listen(topic: string): Entry {
    const ch = this.client.channel(channelName(topic), { config: { broadcast: { self: false, ack: false }, presence: { key: this.key } } });
    const e: Entry = { ch, joined: false };
    this.channels.set(topic, e);
    ch.on('broadcast', { event: 'm' }, (msg: { payload?: { p?: unknown } }) => {
      const p = msg.payload?.p;
      if (typeof p !== 'string') return;
      // Someone writes to our inbox: get the channel of us two ready, for what comes next.
      if (topic === this.inbox) this.pairFromMessage(p);
      this.onMessage?.(topic, p);
    });
    if (isClaim(topic)) ch.on('presence', { event: 'sync' }, () => this.claimSeen(topic, ch));
    ch.subscribe((status) => {
      if (this.closed || this.channels.get(topic) !== e) return;
      if (status === 'SUBSCRIBED') {
        if (e.joined) return;
        e.joined = true;
        if (e.claim !== undefined) this.putClaim(e);
        this.onSubscribed?.(topic);
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        // A channel that fails takes the line with it: relay.ts starts over on a fresh one.
        this.close();
      }
    });
    return e;
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

  /* ---------- Messages to another phone ---------- */

  /** By REST: no need to be in that channel (and so nothing of the others' arrives here). */
  private restSend(topic: string, payload: string, done?: () => void) {
    let ch = this.rest.get(topic);
    if (!ch) {
      ch = this.client.channel(channelName(topic), { config: { broadcast: { self: false } } });
      this.rest.set(topic, ch);
    }
    void ch
      .httpSend('m', { p: payload })
      .catch(() => {
        /* lost like any message on a bad line: relay.ts knocks again, or the ping goes on */
      })
      .finally(() => done?.());
    return true;
  }

  /** The pair channel with the phone of this inbox topic (opened on first use), or null if it's no inbox. */
  private pairWith(topic: string): Pair | null {
    const me = this.inbox && inboxId(this.inbox);
    const other = inboxId(topic);
    if (!me || !other || other === me) return null;
    const known = this.pairs.get(topic);
    if (known) return known;
    const prefix = this.inbox!.slice(0, -`/${me}/in`.length);
    const [a, b] = [me, other].sort();
    const ch = this.client.channel(channelName(`${prefix}/pair/${a}/${b}`), { config: { broadcast: { self: false, ack: false }, presence: { key: this.key } } });
    const pair: Pair = { ch, joined: false, here: false, wasHere: false, sending: 0, queue: [] };
    this.pairs.set(topic, pair);
    ch.on('broadcast', { event: 'm' }, (msg: { payload?: { p?: unknown } }) => {
      const p = msg.payload?.p;
      if (typeof p === 'string' && this.inbox) this.onMessage?.(this.inbox, p);
    });
    ch.on('presence', { event: 'sync' }, () => {
      pair.here = Object.keys(ch.presenceState()).some((k) => k !== this.key);
      window.clearTimeout(pair.idle);
      if (pair.here) {
        pair.wasHere = true;
        this.flush(pair);
      } else if (pair.wasHere) {
        // The other phone left (reloaded: it comes back with a new id): tidy up later.
        pair.idle = window.setTimeout(() => this.dropPair(topic), PAIR_IDLE_MS);
      }
    });
    ch.subscribe((status) => {
      if (this.closed || this.pairs.get(topic) !== pair) return;
      if (status === 'SUBSCRIBED') {
        if (pair.joined) return;
        pair.joined = true;
        void ch.track({}).catch(() => {});
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        this.close();
      }
    });
    return pair;
  }

  /** A message came into our inbox: open the pair with its sender (relay.ts envelopes name it in `f`). */
  private pairFromMessage(payload: string) {
    let from: unknown;
    try {
      from = (JSON.parse(payload) as { f?: unknown }).f;
    } catch {
      return;
    }
    const me = this.inbox && inboxId(this.inbox);
    if (typeof from !== 'string' || !me || !/^[\w-]+$/.test(from)) return;
    this.pairWith(this.inbox!.slice(0, -`/${me}/in`.length) + `/${from}/in`);
  }

  private pairSend(pair: Pair, payload: string) {
    void pair.ch.send({ type: 'broadcast', event: 'm', payload: { p: payload } }).catch(() => {});
  }

  /** The REST ones have gone: what waited for the pair goes now, in order. */
  private flush(pair: Pair) {
    if (pair.sending || !pair.joined || !pair.here) return;
    for (const p of pair.queue.splice(0)) this.pairSend(pair, p);
  }

  private dropPair(topic: string) {
    const pair = this.pairs.get(topic);
    if (!pair || pair.here) return;
    this.pairs.delete(topic);
    void this.client.removeChannel(pair.ch).catch(() => {});
  }
}
