"use client";

import { useEffect, useState } from "react";

export type TickerMessage = {
  id: string;
  text: string;
  created_at: string;
};

const ANIMATION_DURATION = 12000;
const PAUSE_DURATION = 3000;

export function LiveTicker({ messages }: { messages: TickerMessage[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animationState, setAnimationState] = useState<"enter" | "pause" | "exit">("enter");

  useEffect(() => {
    if (!messages.length) return;

    const enterTimer = setTimeout(() => {
      setAnimationState("pause");

      const pauseTimer = setTimeout(() => {
        setAnimationState("exit");

        const exitTimer = setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % messages.length);
          setAnimationState("enter");
        }, ANIMATION_DURATION - PAUSE_DURATION);

        return () => clearTimeout(exitTimer);
      }, PAUSE_DURATION);

      return () => clearTimeout(pauseTimer);
    }, ANIMATION_DURATION - PAUSE_DURATION);

    return () => clearTimeout(enterTimer);
  }, [currentIndex, messages.length]);

  if (!messages.length) return null;

  const currentMessage = messages[currentIndex];

  const animationClass =
    animationState === "enter"
      ? "animate-ticker-enter"
      : animationState === "pause"
        ? "animate-ticker-pause"
        : "animate-ticker-exit";

  return (
    <div className="relative w-full overflow-hidden border-b bg-primary/10 py-3">
      <div className="flex items-center justify-center">
        <div
          key={currentMessage.id}
          className={`text-center text-sm font-medium text-primary sm:text-base ${animationClass}`}
        >
          {currentMessage.text}
        </div>
      </div>
    </div>
  );
}
