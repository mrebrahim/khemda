"use client";

/**
 * أصوات متولّدة بالكود — مفيش ملفات صوت تتحمّل.
 * الصوت بيتقفل من إعداد محفوظ في المتصفح.
 */
const KEY = "hero_sound";

export function soundOn(): boolean {
  try {
    return localStorage.getItem(KEY) !== "off";
  } catch {
    return true;
  }
}

export function setSound(on: boolean): void {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    // المتصفح رافض التخزين — مش مشكلة
  }
}

type Ctx = AudioContext | null;
let ctx: Ctx = null;

function getCtx(): Ctx {
  if (typeof window === "undefined") return null;
  try {
    const AC =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, start: number, dur: number, gain = 0.18) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const vol = c.createGain();
  osc.type = "triangle";
  osc.frequency.value = freq;
  vol.gain.setValueAtTime(0, c.currentTime + start);
  vol.gain.linearRampToValueAtTime(gain, c.currentTime + start + 0.02);
  vol.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  osc.connect(vol).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

/** نغمة قصيرة لما ياخد نقط */
export function playPoint(): void {
  if (!soundOn()) return;
  tone(880, 0, 0.12, 0.12);
  tone(1320, 0.07, 0.14, 0.1);
}

/** فانفارة الترقية — خمس نغمات صاعدة */
export function playLevelUp(): void {
  if (!soundOn()) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  notes.forEach((f, i) => tone(f, i * 0.1, 0.45, 0.2));
}

/** صوت فتح الجايزة */
export function playUnlock(): void {
  if (!soundOn()) return;
  [392, 523.25, 659.25, 880].forEach((f, i) => tone(f, i * 0.08, 0.5, 0.18));
}
