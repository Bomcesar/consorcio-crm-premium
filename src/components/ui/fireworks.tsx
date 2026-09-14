"use client";

import { useEffect, useRef, useState } from "react";

let audioCtx: AudioContext | null = null;

function ensureAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const Win = window as unknown as { AudioContext?: typeof window.AudioContext; webkitAudioContext?: typeof window.AudioContext };
    const Ctor = Win.AudioContext || Win.webkitAudioContext;
    if (!Ctor) return null;
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function unlockAudio() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  if (ctx.state === "suspended") {
    ctx.resume().catch(() => void 0);
  }
}

export function playCelebrationSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    function playCrackPop(c: AudioContext, start: number, freq: number) {
      const duration = 0.4;
      const buffer = c.createBuffer(2, c.sampleRate * duration, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < buffer.length; i++) {
          const t = i / c.sampleRate;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 20) * (1 - t * 2);
          const sine = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 8);
          data[i] = noise * 0.5 + sine * 0.3;
        }
      }
      const source = c.createBufferSource();
      source.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freq * 1.5, start);
      filter.frequency.exponentialRampToValueAtTime(120, start + duration);
      const gain = c.createGain();
      source.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      gain.gain.setValueAtTime(0.15, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
      source.start(start);
      source.stop(start + duration);
    }

    function playExplosion(c: AudioContext, start: number, freqCenter: number) {
      const buffer = c.createBuffer(2, c.sampleRate * 0.8, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < buffer.length; i++) {
          const t = i / c.sampleRate;
          const noise = Math.random() * 2 - 1;
          const decay = Math.exp(-t * 12);
          const sine = Math.sin(2 * Math.PI * freqCenter * t);
          data[i] = noise * decay * 0.5 + sine * decay * 0.3;
        }
      }
      const source = c.createBufferSource();
      source.buffer = buffer;
      const filter = c.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(freqCenter, start);
      filter.frequency.exponentialRampToValueAtTime(80, start + 0.8);
      const gain = c.createGain();
      source.connect(filter);
      filter.connect(gain);
      gain.connect(c.destination);
      gain.gain.setValueAtTime(0.4, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.8);
      source.start(start);
      source.stop(start + 0.8);
    }

    function playWhistle(c: AudioContext, start: number, freqStart: number, dur: number) {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.connect(gain);
      gain.connect(c.destination);
      osc.frequency.setValueAtTime(freqStart, start);
      osc.frequency.exponentialRampToValueAtTime(freqStart * 0.3, start + dur);
      osc.type = "sine";
      gain.gain.setValueAtTime(0.08, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.start(start);
      osc.stop(start + dur);
    }

    // Main explosion (deep, powerful)
    playExplosion(ctx, now, 220);
    playExplosion(ctx, now, 180);

    // Second explosion (smaller, shortly after)
    playExplosion(ctx, now + 0.3, 330);

    // Third explosion (even smaller)
    playExplosion(ctx, now + 0.5, 440);

    // Crackling debris after each explosion
    const crackPitches1 = [1200, 900, 660, 440, 330];
    crackPitches1.forEach((freq, i) => {
      playCrackPop(ctx, now + 0.1 + i * 0.1, freq);
    });

    const crackPitches2 = [800, 600, 400, 280, 200];
    crackPitches2.forEach((freq, i) => {
      playCrackPop(ctx, now + 0.4 + i * 0.08, freq);
    });

    const crackPitches3 = [600, 450, 300, 220];
    crackPitches3.forEach((freq, i) => {
      playCrackPop(ctx, now + 0.6 + i * 0.07, freq);
    });

    // Whistle sounds (fireworks ascending)
    playWhistle(ctx, now + 0.05, 600, 0.6);
    playWhistle(ctx, now + 0.2, 800, 0.7);
    playWhistle(ctx, now + 0.4, 500, 0.5);

    // Low rumble (bass frequencies for impact)
    const rumble = ctx.createOscillator();
    const rumbleGain = ctx.createGain();
    rumble.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);
    rumble.frequency.setValueAtTime(60, now);
    rumble.type = "sine";
    rumbleGain.gain.setValueAtTime(0.3, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
    rumble.start(now);
    rumble.stop(now + 1.5);
  } catch { }
}

export function Fireworks({ isActive, onComplete }: { isActive: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const onFirstInteraction = () => {
      unlockAudio();
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
    window.addEventListener("click", onFirstInteraction);
    window.addEventListener("touchstart", onFirstInteraction);
    window.addEventListener("keydown", onFirstInteraction);

    return () => {
      window.removeEventListener("click", onFirstInteraction);
      window.removeEventListener("touchstart", onFirstInteraction);
      window.removeEventListener("keydown", onFirstInteraction);
    };
  }, []);

  useEffect(() => {
    if (!isActive) {
      setParticles([]);
      return;
    }

    unlockAudio();
    playCelebrationSound();

    const colors = ["#FF4E50", "#F9D423", "#6BCB77", "#4D96FF", "#B366FF", "#FF8A65"];
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    let particleId = 0;
    const allParticles: { id: number; x: number; y: number; color: string; vx: number; vy: number; life: number; size: number }[] = [];

    const createBurst = (cx: number, cy: number) => {
      const color = colors[Math.floor(Math.random() * colors.length)];
      for (let i = 0; i < 50; i++) {
        const angle = (i / 50) * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        allParticles.push({
          id: particleId++,
          x: cx,
          y: cy,
          color,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1,
          size: 3 + Math.random() * 4,
        });
      }
    };

    createBurst(centerX, centerY);
    createBurst(centerX * 0.55, containerHeight * 0.7);
    createBurst(centerX * 1.45, containerHeight * 0.75);

    let lastBurstTime = performance.now();
    let animationStartTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!animationStartTime) animationStartTime = timestamp;
      const elapsed = timestamp - animationStartTime;

      if (elapsed > 3000) {
        setParticles([]);
        if (onComplete) onComplete();
        return;
      }

      const gravity = 0.06;
      const drag = 0.98;

      for (const p of allParticles) {
        p.vx *= drag;
        p.vy *= drag;
        p.vy += gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.015;
        if (p.size > 0) p.size -= 0.05;
      }

      setParticles(allParticles.filter((p) => p.life > 0).map((p) => ({ id: p.id, x: p.x, y: p.y, color: p.color })));

      if (timestamp - lastBurstTime > 800 + Math.random() * 1200) {
        lastBurstTime = timestamp;
        const burstX = containerWidth * (0.2 + Math.random() * 0.6);
        const burstY = containerHeight * (0.2 + Math.random() * 0.6);
        createBurst(burstX, burstY);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    const cleanup = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };

    return () => {
      cleanup();
    };
  }, [isActive, onComplete]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden">
      <div className="absolute inset-0 bg-black/60" />
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.x,
            top: p.y,
            width: "8px",
            height: "8px",
            backgroundColor: p.color,
            boxShadow: `0 0 10px ${p.color}, 0 0 20px ${p.color}`,
          }}
        />
      ))}
    </div>
  );
}
