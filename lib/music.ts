"use client";

/**
 * موسيقى الحماس في لوحة الأبطال وصفحة البطل.
 *
 * بتتولّد بالكود زي باقي أصوات اللعبة — مفيش ملف بيتحمّل ومفيش
 * حقوق على حد. ولو حطيت ملف موسيقى بتاعك في
 * public/audio/hero-theme.mp3 السيستم بيشغّله بدل المولّدة لوحده.
 */

const KEY = "hero_music";
const FILE = "/audio/hero-theme.mp3";
const BPM = 128;
const BEAT = 60 / BPM;

export function musicOn(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setMusic(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // المتصفح رافض التخزين — مش مشكلة
  }
}

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: number | null = null;
let nextNote = 0;
let step = 0;
let el: HTMLAudioElement | null = null;
let playing = false;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/* ── الآلات ─────────────────────────────────────────────── */

function bass(at: number, freq: number) {
  const c = ctx!;
  const osc = c.createOscillator();
  const filter = c.createBiquadFilter();
  const g = c.createGain();

  osc.type = "sawtooth";
  osc.frequency.value = freq;
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(700, at);
  filter.frequency.exponentialRampToValueAtTime(180, at + BEAT);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.5, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + BEAT * 0.9);

  osc.connect(filter).connect(g).connect(master!);
  osc.start(at);
  osc.stop(at + BEAT);
}

function arp(at: number, freq: number) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "square";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(0.16, at + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, at + BEAT * 0.22);
  osc.connect(g).connect(master!);
  osc.start(at);
  osc.stop(at + BEAT * 0.3);
}

function kick(at: number) {
  const c = ctx!;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(160, at);
  osc.frequency.exponentialRampToValueAtTime(45, at + 0.11);
  g.gain.setValueAtTime(0.9, at);
  g.gain.exponentialRampToValueAtTime(0.0001, at + 0.18);
  osc.connect(g).connect(master!);
  osc.start(at);
  osc.stop(at + 0.2);
}

function hat(at: number) {
  const c = ctx!;
  const len = Math.floor(c.sampleRate * 0.04);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);

  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const g = c.createGain();
  src.buffer = buf;
  filter.type = "highpass";
  filter.frequency.value = 7000;
  g.gain.value = 0.12;
  src.connect(filter).connect(g).connect(master!);
  src.start(at);
}

/* ── اللحن ──────────────────────────────────────────────── */

// لا صغير — إيقاع حماسي زي ألعاب القتال
const ROOTS = [55, 55, 43.65, 49]; // La • La • Fa • Sol
const ARPS = [
  [220, 261.63, 329.63, 261.63],
  [220, 329.63, 440, 329.63],
  [174.61, 261.63, 349.23, 261.63],
  [196, 246.94, 392, 246.94],
];

/** كل خطوة = نص بيتة */
function schedule(at: number, i: number) {
  const bar = Math.floor(i / 8) % ROOTS.length;
  const inBar = i % 8;

  if (inBar % 4 === 0) bass(at, ROOTS[bar]);
  if (inBar === 0 || inBar === 3 || inBar === 6) kick(at);
  if (inBar % 2 === 1) hat(at);
  arp(at, ARPS[bar][Math.floor(inBar / 2) % 4]);
}

function tick() {
  const c = ctx;
  if (!c || !master) return;
  while (nextNote < c.currentTime + 0.3) {
    schedule(Math.max(nextNote, c.currentTime), step);
    nextNote += BEAT / 2;
    step++;
  }
}

/* ── التشغيل ────────────────────────────────────────────── */

async function hasFile(): Promise<boolean> {
  try {
    const res = await fetch(FILE, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startMusic(): Promise<boolean> {
  if (playing) return true;

  // ملف المستخدم لو موجود
  if (await hasFile()) {
    try {
      el ??= new Audio(FILE);
      el.loop = true;
      el.volume = 0.35;
      await el.play();
      playing = true;
      return true;
    } catch {
      el = null;
    }
  }

  const c = audio();
  if (!c) return false;

  master ??= c.createGain();
  master.gain.setValueAtTime(0.0001, c.currentTime);
  master.gain.exponentialRampToValueAtTime(0.18, c.currentTime + 1.2);
  master.connect(c.destination);

  nextNote = c.currentTime + 0.1;
  step = 0;
  timer = window.setInterval(tick, 60);
  playing = true;
  return true;
}

export function stopMusic(): void {
  playing = false;
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
  }
  if (el) {
    el.pause();
    el.currentTime = 0;
  }
  if (master && ctx) {
    master.gain.cancelScheduledValues(ctx.currentTime);
    master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
    master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    const old = master;
    setTimeout(() => old.disconnect(), 600);
    master = null;
  }
}

export function isPlaying(): boolean {
  return playing;
}
