import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CONFETTI, TIMING } from '../game/constants';

/**
 * Imperative handle exposed by `Confetti`. Call `burst(x, y, reduceMotion)`
 * with a canvas-relative origin to fire the celebration.
 */
export interface ConfettiHandle {
  burst(originX: number, originY: number, reduceMotion: boolean): void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vr: number;
  color: string;
  shape: 'star' | 'rect' | 'circ';
}

/**
 * Confetti — a full-bleed `<canvas>` overlay (pointer-events:none) that bursts
 * brand-colored stars/rects/circles from a tap origin. DPR-aware and re-sized
 * on layout changes. The physics is ported verbatim from the prototype: radial
 * launch + upward kick, gravity +0.17/frame, horizontal drag ×0.99, alpha fade.
 * Reduce-motion collapses to 5 soft sparkle stars.
 */
const Confetti = forwardRef<ConfettiHandle>(function Confetti(_props, ref) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dprRef = useRef(1);
  const rafRef = useRef<number | null>(null);

  const sizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    dprRef.current = dpr;
  };

  useEffect(() => {
    sizeCanvas();
    const onResize = () => sizeCanvas();
    window.addEventListener('resize', onResize);

    let observer: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current) {
      observer = new ResizeObserver(() => sizeCanvas());
      observer.observe(canvasRef.current);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      burst(originX: number, originY: number, reduceMotion: boolean) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        sizeCanvas();
        // jsdom (and headless environments) may throw or return null here.
        let ctx: CanvasRenderingContext2D | null = null;
        try {
          ctx = canvas.getContext('2d');
        } catch {
          ctx = null;
        }
        if (!ctx) return; // no 2d context → no-op safely.

        const dpr = dprRef.current || 1;
        const colors = CONFETTI.colors;
        const ox = originX;
        const oy = originY;

        const parts: Particle[] = [];
        if (reduceMotion) {
          for (let i = 0; i < CONFETTI.sparkles; i++) {
            const a = (i / CONFETTI.sparkles) * Math.PI * 2;
            parts.push({
              x: ox,
              y: oy,
              vx: Math.cos(a) * 1.2,
              vy: Math.sin(a) * 1.2,
              size: 12,
              rot: 0,
              vr: 0.04,
              color: '#FFC94D',
              shape: 'star',
            });
          }
        } else {
          for (let i = 0; i < CONFETTI.full; i++) {
            const a = Math.random() * Math.PI * 2;
            const sp = 3.5 + Math.random() * 8;
            parts.push({
              x: ox,
              y: oy,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp - 4,
              size: 6 + Math.random() * 9,
              rot: Math.random() * 6,
              vr: -0.25 + Math.random() * 0.5,
              color: colors[i % colors.length],
              shape:
                i % 3 === 0 ? 'star' : Math.random() < 0.5 ? 'rect' : 'circ',
            });
          }
        }

        const start = performance.now();
        const dur = reduceMotion
          ? TIMING.confettiReduceMotion
          : TIMING.confettiFull;

        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

        const drawStar = (s: number) => {
          ctx.beginPath();
          for (let k = 0; k < 5; k++) {
            const ang = -Math.PI / 2 + (k * 2 * Math.PI) / 5;
            ctx.lineTo(Math.cos(ang) * s, Math.sin(ang) * s);
            const a2 = ang + Math.PI / 5;
            ctx.lineTo(Math.cos(a2) * s * 0.45, Math.sin(a2) * s * 0.45);
          }
          ctx.closePath();
          ctx.fill();
        };

        const tick = (now: number) => {
          const canvasNow = canvasRef.current;
          if (!canvasNow) return;
          const t = (now - start) / dur;
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvasNow.width, canvasNow.height);
          ctx.scale(dpr, dpr);
          for (const p of parts) {
            if (!reduceMotion) {
              p.vy += CONFETTI.gravity;
              p.vx *= CONFETTI.drag;
            }
            p.x += p.vx;
            p.y += p.vy;
            p.rot += p.vr;
            const life = 1 - t;
            if (life <= 0) continue;
            ctx.globalAlpha = Math.max(0, Math.min(1, life * 1.4));
            ctx.fillStyle = p.color;
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rot);
            if (p.shape === 'rect') {
              ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.62);
            } else if (p.shape === 'star') {
              drawStar(p.size * 0.7);
            } else {
              ctx.beginPath();
              ctx.arc(0, 0, p.size / 2, 0, 7);
              ctx.fill();
            }
            ctx.rotate(-p.rot);
            ctx.translate(-p.x, -p.y);
          }
          if (t < 1) {
            rafRef.current = requestAnimationFrame(tick);
          } else {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.clearRect(0, 0, canvasNow.width, canvasNow.height);
            rafRef.current = null;
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      },
    }),
    [],
  );

  return <canvas ref={canvasRef} className="cf-confetti" aria-hidden="true" />;
});

export default Confetti;
