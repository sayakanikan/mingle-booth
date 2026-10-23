'use client';

import { useEffect, useRef } from 'react';
import { initParticles } from '@/lib/booth/particles';

export function Particles() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const cleanup = initParticles(canvasRef.current);
    return cleanup;
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0"
    />
  );
}
