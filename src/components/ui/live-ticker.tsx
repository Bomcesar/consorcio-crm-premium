"use client";

import { useEffect, useState } from "react";

export type TickerMessage = {
  id: string;
  text: string;
  created_at: string;
};

const ENTER_DURATION = 4000;
const PAUSE_DURATION = 3000;
const EXIT_DURATION = 4000;
const TOTAL_DURATION = ENTER_DURATION + PAUSE_DURATION + EXIT_DURATION;

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
        }, EXIT_DURATION);

        return () => clearTimeout(exitTimer);
      }, PAUSE_DURATION);

      return () => clearTimeout(pauseTimer);
    }, ENTER_DURATION);

    return () => clearTimeout(enterTimer);
  }, [currentIndex, messages.length]);

  // When a new message is added, show it immediately
  const latestMessageId = messages[0]?.id;
  useEffect(() => {
    if (latestMessageId && currentIndex !== 0) {
      setCurrentIndex(0);
      setAnimationState("enter");
    }
  }, [latestMessageId, currentIndex]);

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
