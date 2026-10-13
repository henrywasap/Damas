import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Position } from '../types/checkers.js';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Particle {
  id: number;
  x: number;       // px from left of container
  y: number;       // px from top  of container
  vx: number;
  vy: number;
  life: number;    // 0..1  (1 = fresh)
  size: number;
  hue: number;
  shape: 'circle' | 'star' | 'diamond';
}

interface TrailDot {
  id: number;
  x: number;
  y: number;
  born: number;    // Date.now()
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

let _pid = 0;
const uid = () => ++_pid;

const TRAIL_TTL = 900; // ms each trail dot lives

// ─── Component ───────────────────────────────────────────────────────────────

export interface ParticleTrailProps {
  /** The last move that happened (null if none). */
  lastKingMove: { from: Position; to: Position } | null;
  /** Size of one board cell in px (needed to compute centre coords). */
  cellSizePx: number;
  /** Whether board is flipped (black at bottom). */
  isFlipped: boolean;
}

export const ParticleTrail: React.FC<ParticleTrailProps> = ({
  lastKingMove,
  cellSizePx,
  isFlipped,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const trailDotsRef = useRef<TrailDot[]>([]);
  const rafRef = useRef<number>(0);
  const [canvasDim, setCanvasDim] = useState({ w: 0, h: 0 });

  // Compute board size whenever cellSize changes
  useEffect(() => {
    const size = cellSizePx * 8;
    setCanvasDim({ w: size, h: size });
  }, [cellSizePx]);

  // Helper: convert board Position → pixel centre (within 8×8 area)
  const posToPixel = useCallback(
    (pos: Position) => {
      const displayRow = isFlipped ? 7 - pos.row : pos.row;
      const displayCol = isFlipped ? 7 - pos.col : pos.col;
      return {
        x: displayCol * cellSizePx + cellSizePx / 2,
        y: displayRow * cellSizePx + cellSizePx / 2,
      };
    },
    [cellSizePx, isFlipped]
  );

  // When a king move arrives → spawn trail dots along the path + burst at destination
  useEffect(() => {
    if (!lastKingMove) return;

    const from = posToPixel(lastKingMove.from);
    const to = posToPixel(lastKingMove.to);

    // Interpolate trail dots along the path
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(6, Math.round(dist / (cellSizePx * 0.35)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      trailDotsRef.current.push({
        id: uid(),
        x: from.x + (to.x - from.x) * t,
        y: from.y + (to.y - from.y) * t,
        born: Date.now() - i * 18, // stagger birth times so they fade in sequence
      });
    }

    // Burst particles at destination
    for (let i = 0; i < 24; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.5;
      particlesRef.current.push({
        id: uid(),
        x: to.x,
        y: to.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        size: 3 + Math.random() * 5,
        hue: Math.random() * 60 + 30,   // gold-yellow range
        shape: (['circle', 'star', 'diamond'] as const)[Math.floor(Math.random() * 3)],
      });
    }
  }, [lastKingMove, posToPixel, cellSizePx]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const now = Date.now();

      // ── Draw trail dots ──────────────────────────────────────────────────
      trailDotsRef.current = trailDotsRef.current.filter((dot) => {
        const age = now - dot.born;
        if (age > TRAIL_TTL) return false;
        const alpha = 1 - age / TRAIL_TTL;
        const radius = (cellSizePx * 0.22) * alpha;

        // Outer glow
        const grad = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, radius * 2.5);
        grad.addColorStop(0, `hsla(50, 100%, 80%, ${alpha * 0.9})`);
        grad.addColorStop(0.4, `hsla(45, 100%, 60%, ${alpha * 0.6})`);
        grad.addColorStop(1, `hsla(40, 100%, 40%, 0)`);
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core sparkle
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(60, 100%, 90%, ${alpha})`;
        ctx.fill();

        return true;
      });

      // ── Draw burst particles ─────────────────────────────────────────────
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravity
        p.life -= 0.025;
        if (p.life <= 0) return false;

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.life * 8);

        const c = `hsl(${p.hue}, 100%, ${50 + 40 * p.life}%)`;
        ctx.fillStyle = c;
        ctx.shadowColor = c;
        ctx.shadowBlur = 10;

        if (p.shape === 'star') {
          drawStar(ctx, 0, 0, 5, p.size, p.size * 0.45);
        } else if (p.shape === 'diamond') {
          drawDiamond(ctx, 0, 0, p.size);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
        return true;
      });

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasDim, cellSizePx]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasDim.w}
      height={canvasDim.h}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 20,
      }}
    />
  );
};

// ─── Shape helpers ────────────────────────────────────────────────────────────

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  spikes: number,
  outerR: number,
  innerR: number
) {
  let rot = (-Math.PI / 2) * 3;
  const step = Math.PI / spikes;
  ctx.beginPath();
  ctx.moveTo(cx, cy - outerR);
  for (let i = 0; i < spikes; i++) {
    ctx.lineTo(
      cx + Math.cos(rot) * outerR,
      cy + Math.sin(rot) * outerR
    );
    rot += step;
    ctx.lineTo(
      cx + Math.cos(rot) * innerR,
      cy + Math.sin(rot) * innerR
    );
    rot += step;
  }
  ctx.lineTo(cx, cy - outerR);
  ctx.closePath();
  ctx.fill();
}

function drawDiamond(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r * 0.6, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r * 0.6, cy);
  ctx.closePath();
  ctx.fill();
}
