"use client";

import { useEffect, useRef } from "react";

export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const render = async () => {
      const { default: mermaid } = await import("mermaid");
      mermaid.initialize({
        startOnLoad: false,
        theme: document.documentElement.classList.contains("dark")
          ? "dark"
          : "neutral",
        fontFamily: "inherit",
        themeVariables: {
          fontSize: "14px",
        },
      });

      if (!ref.current) return;

      // Clear previous render
      while (ref.current.firstChild) {
        ref.current.removeChild(ref.current.firstChild);
      }

      const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;
      const { svg } = await mermaid.render(id, chart);

      // Parse the SVG string safely using DOMParser
      const parser = new DOMParser();
      const doc = parser.parseFromString(svg, "image/svg+xml");
      const svgElement = doc.documentElement;
      ref.current.appendChild(svgElement);
    };

    render();
  }, [chart]);

  return (
    <div
      ref={ref}
      className="my-6 flex justify-center [&_svg]:max-w-full"
    />
  );
}
