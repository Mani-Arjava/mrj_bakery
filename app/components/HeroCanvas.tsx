'use client';
import { useEffect, useRef } from 'react';

type Particle = {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  alpha: number;
  color: string;
};

const COLORS = ['rgba(255,250,242,', 'rgba(245,210,142,', 'rgba(217,165,65,', 'rgba(240,226,190,'];

function spawn(w: number, h: number): Particle {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.28,
    vy: -(Math.random() * 0.38 + 0.08),
    r: Math.random() * 2.4 + 0.4,
    alpha: Math.random() * 0.45 + 0.08,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
  };
}

export function HeroCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let w = 0, h = 0;
    const particles: Particle[] = [];

    function resize() {
      w = canvas.offsetWidth;
      h = canvas.offsetHeight;
      canvas.width = w;
      canvas.height = h;
    }

    resize();
    for (let i = 0; i < 200; i++) particles.push(spawn(w, h));

    let mx = 0;
    const onMouse = (e: MouseEvent) => { mx = (e.clientX / window.innerWidth - 0.5) * 0.6; };
    window.addEventListener('mousemove', onMouse);

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf: number;
    function draw() {
      raf = requestAnimationFrame(draw);
      ctx.clearRect(0, 0, w, h);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.alpha})`;
        ctx.fill();
        if (!reduced) {
          p.x += p.vx + mx * 0.012;
          p.y += p.vy;
          if (p.y < -8) { p.y = h + 8; p.x = Math.random() * w; }
          if (p.x < -8) p.x = w + 8;
          if (p.x > w + 8) p.x = -8;
        }
      }
    }
    draw();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener('mousemove', onMouse);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
