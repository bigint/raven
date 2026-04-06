"use client";

import { useEffect, useRef } from "react";

export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  useEffect(() => {
    const currentRender = ++renderIdRef.current;

    const render = async () => {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        fontFamily: "inherit",
        startOnLoad: false,
        theme: document.documentElement.classList.contains("dark")
          ? "dark"
          : "neutral",
        themeVariables: {
          fontSize: "14px"
        }
      });

      // Abort if a newer render was triggered (Strict Mode double-mount)
      if (currentRender !== renderIdRef.current || !ref.current) return;

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      const { svg } = await mermaid.render(id, chart);

      if (currentRender !== renderIdRef.current || !ref.current) return;

      // Clear previous content safely
      while (ref.current.firstChild) {
        ref.current.removeChild(ref.current.firstChild);
      }

      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");
      const svgElement = doc.documentElement;
      ref.current.appendChild(svgElement);
    };

    render();
  }, [chart]);

  return (
    <div
      className="my-6 flex justify-center overflow-x-auto [&_svg]:max-w-full"
      ref={ref}
    />
  );
}
