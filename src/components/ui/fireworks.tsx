"use client";

import { useEffect, useRef, useState } from "react";

let audioCtx: AudioContext | null = null;
let hallelujahBuffer: AudioBuffer | null = null;
let hallelujahLoading = false;

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

async function loadHallelujahBuffer(ctx: AudioContext): Promise<AudioBuffer | null> {
  if (hallelujahBuffer) return hallelujahBuffer;
  if (hallelujahLoading) {
    while (hallelujahLoading) {
      await new Promise((r) => setTimeout(r, 50));
    }
    return hallelujahBuffer;
  }
  hallelujahLoading = true;
  try {
    const res = await fetch("/sounds/hallelujah-chorus.mp3");
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const arrayBuffer = await res.arrayBuffer();
    hallelujahBuffer = await ctx.decodeAudioData(arrayBuffer);
    return hallelujahBuffer;
  } catch {
    return null;
  } finally {
    hallelujahLoading = false;
  }
}

export function playCelebrationSound() {
  const ctx = ensureAudioContext();
  if (!ctx) return;
  try {
    const now = ctx.currentTime;

    loadHallelujahBuffer(ctx).then((buffer) => {
      if (!buffer) return;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      const hallelujahGain = ctx.createGain();
      hallelujahGain.gain.setValueAtTime(0.4, now);
      hallelujahGain.gain.exponentialRampToValueAtTime(0.001, now + 17);
      source.connect(hallelujahGain);
      hallelujahGain.connect(ctx.destination);
      source.start(now + 0.1);
    });
  } catch { }
}

export function Fireworks({ isActive, onComplete }: { isActive: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; color: string }[]>([]);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const onFirstInteraction = () => {
      unlockAudio();
      const ctx = ensureAudioContext();
      if (ctx) {
        void loadHallelujahBuffer(ctx);
      }
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
    void playCelebrationSound();

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
