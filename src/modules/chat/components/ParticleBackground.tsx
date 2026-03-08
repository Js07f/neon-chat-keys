import { useMemo } from "react";

interface Particle {
  id: number;
  left: string;
  size: number;
  duration: string;
  delay: string;
  color: string;
}

export default function ParticleBackground() {
  const particles = useMemo<Particle[]>(() => {
    const colors = [
      "hsl(var(--neon-glow) / 0.4)",
      "hsl(var(--neon-cyan) / 0.3)",
      "hsl(var(--neon-pink) / 0.3)",
    ];
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      size: Math.random() * 3 + 1,
      duration: `${Math.random() * 8 + 6}s`,
      delay: `${Math.random() * 10}s`,
      color: colors[i % colors.length],
    }));
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: p.left,
            bottom: "-10px",
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `float-particle ${p.duration} ${p.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}
