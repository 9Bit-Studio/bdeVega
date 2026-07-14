import type { GameAssetPack, GameSpec } from "@vega/spec";
import { useEffect } from "react";

interface GameAudioProps {
  assets: GameAssetPack;
  style: GameSpec["audio"]["musicStyle"];
}

const patterns = {
  chiptune: [523.25, 659.25, 783.99, 659.25, 587.33, 659.25, 880, 783.99],
  synthwave: [110, 164.81, 220, 164.81, 130.81, 196, 261.63, 196],
  ambient: [220, 261.63, 329.63, 392, 329.63, 261.63],
  "orchestral-lite": [196, 246.94, 293.66, 392, 293.66, 246.94],
} as const;

function startProceduralPreview(style: GameAudioProps["style"], volume: number) {
  const AudioContextConstructor = window.AudioContext
    ?? (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return () => undefined;

  const context = new AudioContextConstructor();
  const notes = patterns[style];
  const intervalMs = style === "ambient" ? 780 : 360;
  let step = 0;
  const playNote = () => {
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = style === "chiptune" ? "square" : style === "ambient" ? "sine" : "triangle";
    oscillator.frequency.value = notes[step % notes.length];
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.005, volume * 0.22), now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + intervalMs / 1000 * 0.88);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + intervalMs / 1000);
    step += 1;
  };
  playNote();
  const timer = window.setInterval(playNote, intervalMs);
  return () => {
    window.clearInterval(timer);
    void context.close();
  };
}

/** Starts only after a player gesture, satisfying browser autoplay rules. */
export function GameAudio({ assets, style }: GameAudioProps) {
  useEffect(() => {
    let stop: () => void = () => {};
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      if (assets.audio.musicUrl && typeof Audio !== "undefined") {
        const music = new Audio(assets.audio.musicUrl);
        music.loop = true;
        music.volume = assets.audio.volume;
        void music.play().catch(() => undefined);
        stop = () => { music.pause(); music.src = ""; };
      } else {
        stop = startProceduralPreview(style, assets.audio.volume);
      }
    };

    window.addEventListener("pointerdown", start, { once: true });
    window.addEventListener("keydown", start, { once: true });
    return () => {
      window.removeEventListener("pointerdown", start);
      window.removeEventListener("keydown", start);
      stop();
    };
  }, [assets, style]);

  return null;
}
