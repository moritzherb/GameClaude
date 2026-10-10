/*
 * A tiny MQTT 3.1.1 client over WebSocket: just what the room relay needs (QoS 0 messages,
 * retained messages and a last will). MQTT servers pass messages between phones, whatever
 * network each phone is on.
 */

const enc = new TextEncoder();
const dec = new TextDecoder();

const CONNECT = 0x10;
const CONNACK = 2;
const PUBLISH = 3;
const SUBSCRIBE = 0x82;
const SUBACK = 9;
const PINGREQ = new Uint8Array([0xc0, 0]);
const DISCONNECT = new Uint8Array([0xe0, 0]);

/** A string with its 2-byte length in front. */
function str(s: string | Uint8Array) {
  const b = typeof s === 'string' ? enc.encode(s) : s;
  const out = new Uint8Array(2 + b.length);
  out[0] = b.length >> 8;
  out[1] = b.length & 255;
  out.set(b, 2);
  return out;
}

function packet(type: number, ...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const head = [type];
  let x = len;
  do {
    let byte = x % 128;
    x = Math.floor(x / 128);
    if (x > 0) byte |= 128;
    head.push(byte);
  } while (x > 0);
  const out = new Uint8Array(head.length + len);
  out.set(head, 0);
  let at = head.length;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

export interface MqttOptions {
  url: string;
  /** Published by the server for us if the connection drops without saying goodbye. */
  will?: { topic: string; payload: string; retain: boolean };
  /** Give up connecting after this long. */
  timeout?: number;
}

const KEEPALIVE_S = 30;
const PING_MS = 10_000;
/** No answer at all for this long: the connection is dead even if the browser hasn't noticed. */
const SILENT_MS = 25_000;

export class Mqtt {
  ready = false;
  closed = false;
  onReady?: () => void;
  onClose?: () => void;
  onMessage?: (topic: string, payload: string) => void;
  onSubscribed?: (topic: string) => void;

  private ws: WebSocket;
  private buf = new Uint8Array(0);
  private nextId = 1;
  private subs = new Map<number, string>();
  private timers: number[] = [];
  private heard = Date.now();
  private checkTimer?: number;

  constructor(opts: MqttOptions) {
    const ws = new WebSocket(opts.url, ['mqtt']);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;
    ws.onopen = () => {
      const id = `prost-${Math.random().toString(36).slice(2, 12)}`;
      const will = opts.will;
      // Clean session; will flag (+ retain) if there is one.
      const flags = 0x02 | (will ? 0x04 | (will.retain ? 0x20 : 0) : 0);
      const head = new Uint8Array([...str('MQTT'), 4, flags, 0, KEEPALIVE_S]);
      this.raw(packet(CONNECT, head, str(id), ...(will ? [str(will.topic), str(will.payload)] : [])));
    };
    ws.onmessage = (e) => this.feed(new Uint8Array(e.data as ArrayBuffer));
    ws.onclose = () => this.end();
    ws.onerror = () => this.end();
    this.timers.push(window.setTimeout(() => !this.ready && this.close(), opts.timeout ?? 8000));
  }

  subscribe(topic: string) {
    if (!this.ready) return;
    const id = this.nextId;
    this.nextId = (this.nextId % 65535) + 1;
    this.subs.set(id, topic);
    this.raw(packet(SUBSCRIBE, new Uint8Array([id >> 8, id & 255]), str(topic), new Uint8Array([0])));
  }

  publish(topic: string, payload: string, retain = false) {
    if (!this.ready) return false;
    return this.raw(packet((PUBLISH << 4) | (retain ? 1 : 0), str(topic), enc.encode(payload)));
  }

  /** Make sure the connection is still alive (after the phone was asleep): close it if no answer comes soon. */
  check() {
    if (!this.ready || this.checkTimer) return;
    const asked = Date.now();
    this.raw(PINGREQ);
    this.checkTimer = window.setTimeout(() => {
      this.checkTimer = undefined;
      if (this.heard < asked) this.close();
    }, 4000);
  }

  close() {
    if (this.closed) return;
    if (this.ready) this.raw(DISCONNECT);
    try {
      this.ws.close();
    } catch {
      /* already closing */
    }
    this.end();
  }

  private raw(data: Uint8Array<ArrayBuffer>) {
    if (this.ws.readyState !== WebSocket.OPEN) return false;
    this.ws.send(data);
    return true;
  }

  private end() {
    if (this.closed) return;
    this.closed = true;
    this.ready = false;
    this.timers.forEach((t) => window.clearTimeout(t));
    window.clearTimeout(this.checkTimer);
    this.onClose?.();
  }

  private feed(chunk: Uint8Array) {
    this.heard = Date.now();
    const all = new Uint8Array(this.buf.length + chunk.length);
    all.set(this.buf, 0);
    all.set(chunk, this.buf.length);
    let at = 0;
    while (all.length - at >= 2) {
      let len = 0;
      let mul = 1;
      let i = at + 1;
      let done = false;
      while (i < all.length && i < at + 5) {
        const byte = all[i++];
        len += (byte & 127) * mul;
        mul *= 128;
        if (!(byte & 128)) {
          done = true;
          break;
        }
      }
      if (!done || all.length < i + len) break;
      this.handle(all[at], all.subarray(i, i + len));
      if (this.closed) return;
      at = i + len;
    }
    this.buf = all.slice(at);
  }

  private handle(first: number, body: Uint8Array) {
    const type = first >> 4;
    if (type === CONNACK) {
      if (body[1] !== 0) return this.close();
      this.ready = true;
      this.timers.push(
        window.setInterval(() => {
          if (Date.now() - this.heard > SILENT_MS) this.close();
          else this.raw(PINGREQ);
        }, PING_MS),
      );
      this.onReady?.();
    } else if (type === PUBLISH) {
      const qos = (first >> 1) & 3;
      const topicLen = (body[0] << 8) | body[1];
      const topic = dec.decode(body.subarray(2, 2 + topicLen));
      const start = 2 + topicLen + (qos > 0 ? 2 : 0);
      this.onMessage?.(topic, dec.decode(body.subarray(start)));
    } else if (type === SUBACK) {
      const id = (body[0] << 8) | body[1];
      const topic = this.subs.get(id);
      this.subs.delete(id);
      if (topic) this.onSubscribed?.(topic);
    }
  }
}
