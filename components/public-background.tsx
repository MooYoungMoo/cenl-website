"use client";

import type { CSSProperties } from "react";
import { usePathname } from "next/navigation";

type SignalParticle = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  driftX: number;
  driftY: number;
  duration: number;
  delay: number;
  tone: "blue" | "cyan" | "teal";
};

type MolecularNode = {
  x: number;
  y: number;
  size: number;
  opacity: number;
  delay: number;
};

type BackgroundStyle = CSSProperties & Record<string, string>;

const signalParticles: SignalParticle[] = [
  { x: 6, y: 22, size: 3.4, opacity: 0.42, driftX: 34, driftY: -24, duration: 42, delay: -4, tone: "cyan" },
  { x: 13, y: 68, size: 2.3, opacity: 0.34, driftX: 22, driftY: -30, duration: 58, delay: -18, tone: "blue" },
  { x: 18, y: 38, size: 1.8, opacity: 0.36, driftX: -18, driftY: 26, duration: 49, delay: -31, tone: "teal" },
  { x: 24, y: 12, size: 2.8, opacity: 0.32, driftX: 28, driftY: 20, duration: 63, delay: -12, tone: "cyan" },
  { x: 31, y: 78, size: 3.1, opacity: 0.38, driftX: -26, driftY: -18, duration: 54, delay: -39, tone: "blue" },
  { x: 36, y: 31, size: 2.1, opacity: 0.34, driftX: 24, driftY: -20, duration: 44, delay: -22, tone: "teal" },
  { x: 42, y: 58, size: 3.7, opacity: 0.28, driftX: -32, driftY: 26, duration: 72, delay: -50, tone: "cyan" },
  { x: 47, y: 18, size: 1.9, opacity: 0.35, driftX: 18, driftY: 30, duration: 52, delay: -6, tone: "blue" },
  { x: 54, y: 83, size: 2.5, opacity: 0.3, driftX: -20, driftY: -28, duration: 67, delay: -28, tone: "teal" },
  { x: 61, y: 42, size: 3.2, opacity: 0.36, driftX: 30, driftY: 18, duration: 48, delay: -14, tone: "cyan" },
  { x: 68, y: 24, size: 2.2, opacity: 0.32, driftX: -24, driftY: 22, duration: 56, delay: -45, tone: "blue" },
  { x: 74, y: 72, size: 3.6, opacity: 0.33, driftX: 26, driftY: -32, duration: 61, delay: -25, tone: "teal" },
  { x: 81, y: 34, size: 2, opacity: 0.37, driftX: -28, driftY: -18, duration: 47, delay: -35, tone: "cyan" },
  { x: 88, y: 56, size: 2.7, opacity: 0.31, driftX: 18, driftY: 24, duration: 69, delay: -8, tone: "blue" },
  { x: 94, y: 18, size: 1.7, opacity: 0.3, driftX: -22, driftY: 32, duration: 59, delay: -52, tone: "teal" },
  { x: 9, y: 47, size: 1.9, opacity: 0.28, driftX: 28, driftY: 16, duration: 36, delay: -9, tone: "blue" },
  { x: 16, y: 86, size: 2.6, opacity: 0.31, driftX: -16, driftY: -34, duration: 74, delay: -44, tone: "cyan" },
  { x: 27, y: 52, size: 1.6, opacity: 0.4, driftX: 20, driftY: -24, duration: 41, delay: -16, tone: "teal" },
  { x: 33, y: 20, size: 2.4, opacity: 0.28, driftX: -30, driftY: 18, duration: 64, delay: -33, tone: "cyan" },
  { x: 39, y: 91, size: 1.8, opacity: 0.33, driftX: 34, driftY: -16, duration: 55, delay: -21, tone: "blue" },
  { x: 49, y: 37, size: 2.9, opacity: 0.29, driftX: -18, driftY: 30, duration: 77, delay: -61, tone: "teal" },
  { x: 57, y: 9, size: 2.1, opacity: 0.3, driftX: 26, driftY: 24, duration: 46, delay: -27, tone: "cyan" },
  { x: 64, y: 65, size: 1.7, opacity: 0.42, driftX: -24, driftY: -22, duration: 39, delay: -5, tone: "blue" },
  { x: 71, y: 48, size: 2.6, opacity: 0.35, driftX: 32, driftY: -16, duration: 62, delay: -36, tone: "cyan" },
  { x: 79, y: 88, size: 1.9, opacity: 0.3, driftX: -30, driftY: -26, duration: 66, delay: -19, tone: "teal" },
  { x: 86, y: 8, size: 3, opacity: 0.27, driftX: 16, driftY: 34, duration: 70, delay: -48, tone: "blue" },
  { x: 92, y: 76, size: 2.1, opacity: 0.32, driftX: -18, driftY: -28, duration: 53, delay: -11, tone: "cyan" },
  { x: 4, y: 83, size: 1.5, opacity: 0.35, driftX: 30, driftY: -18, duration: 45, delay: -29, tone: "teal" },
  { x: 21, y: 4, size: 1.7, opacity: 0.29, driftX: -20, driftY: 28, duration: 57, delay: -41, tone: "blue" },
  { x: 44, y: 6, size: 2.5, opacity: 0.25, driftX: 22, driftY: 32, duration: 80, delay: -73, tone: "cyan" },
  { x: 59, y: 28, size: 1.4, opacity: 0.38, driftX: -28, driftY: 18, duration: 43, delay: -15, tone: "teal" },
  { x: 69, y: 5, size: 1.8, opacity: 0.3, driftX: 24, driftY: 30, duration: 60, delay: -23, tone: "cyan" },
  { x: 96, y: 43, size: 2.4, opacity: 0.34, driftX: -34, driftY: 20, duration: 51, delay: -37, tone: "blue" },
  { x: 12, y: 28, size: 1.3, opacity: 0.38, driftX: 18, driftY: -26, duration: 38, delay: -17, tone: "teal" },
  { x: 52, y: 52, size: 1.6, opacity: 0.35, driftX: -26, driftY: 24, duration: 50, delay: -34, tone: "blue" },
  { x: 83, y: 63, size: 1.4, opacity: 0.36, driftX: 28, driftY: -22, duration: 44, delay: -26, tone: "cyan" },
];

const molecularNodes: MolecularNode[] = [
  { x: 10, y: 61, size: 18, opacity: 0.2, delay: -8 },
  { x: 22, y: 27, size: 24, opacity: 0.16, delay: -18 },
  { x: 40, y: 72, size: 28, opacity: 0.14, delay: -34 },
  { x: 58, y: 22, size: 20, opacity: 0.18, delay: -13 },
  { x: 73, y: 57, size: 30, opacity: 0.13, delay: -42 },
  { x: 88, y: 30, size: 22, opacity: 0.15, delay: -27 },
  { x: 66, y: 86, size: 18, opacity: 0.17, delay: -51 },
];

function particleStyle(particle: SignalParticle): BackgroundStyle {
  return {
    "--x": `${particle.x}%`,
    "--y": `${particle.y}%`,
    "--size": `${particle.size}px`,
    "--opacity": String(particle.opacity),
    "--drift-x": `${particle.driftX}px`,
    "--drift-y": `${particle.driftY}px`,
    "--duration": `${particle.duration}s`,
    "--delay": `${particle.delay}s`,
  } as BackgroundStyle;
}

function nodeStyle(node: MolecularNode): BackgroundStyle {
  return {
    "--x": `${node.x}%`,
    "--y": `${node.y}%`,
    "--size": `${node.size}px`,
    "--opacity": String(node.opacity),
    "--delay": `${node.delay}s`,
  } as BackgroundStyle;
}

export function PublicBackground() {
  const pathname = usePathname();

  if (pathname?.startsWith("/portal")) {
    return null;
  }

  return (
    <div className="public-background" aria-hidden="true">
      <div className="public-background__wash" />
      <svg
        className="public-background__trails"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        focusable="false"
      >
        <path d="M3 72 C 20 58, 24 37, 42 44 S 66 61, 84 38" />
        <path d="M14 22 C 28 18, 34 31, 47 27 S 73 9, 93 18" />
        <path d="M7 89 C 28 79, 41 84, 55 70 S 80 53, 97 64" />
        <path d="M2 42 C 17 48, 25 18, 39 23 S 54 45, 68 34 S 82 20, 98 29" />
      </svg>
      <div className="public-background__nodes">
        {molecularNodes.map((node, index) => (
          <span
            key={`node-${index}`}
            className="public-background__node"
            style={nodeStyle(node)}
          />
        ))}
      </div>
      <div className="public-background__signals">
        {signalParticles.map((particle, index) => (
          <span
            key={`signal-${index}`}
            className={`public-background__particle public-background__particle--${particle.tone}`}
            style={particleStyle(particle)}
          />
        ))}
      </div>
    </div>
  );
}
