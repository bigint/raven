"use client";

import { useEffect, useState } from "react";
import { TextMorph } from "torph/react";

const heroWords = ["all your AI", "every model", "every provider", "your team"];

export const HeroWordRotator = () => {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((i) => (i + 1) % heroWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return <TextMorph as="span">{heroWords[wordIndex]}</TextMorph>;
};
