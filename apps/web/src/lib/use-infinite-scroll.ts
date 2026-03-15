"use client";

import { useEffect, useRef } from "react";
import { useInView } from "react-intersection-observer";

export const useInfiniteScroll = (callback: () => void, enabled: boolean) => {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const { ref, inView } = useInView({
    rootMargin: "200px"
  });

  useEffect(() => {
    if (inView && enabled) {
      callbackRef.current();
    }
  }, [inView, enabled]);

  return ref;
};
