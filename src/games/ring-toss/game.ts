import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const RINGS_PER_ROUND = 10;
/** Seconds a ring spends in the air. */
export const FLIGHT_TIME = 0.6;
/** How far, in pixels, the hand wobbles either side of the aim. */
export const WOBBLE = 18;
export const THROWER = { x: WIDTH / 2, y: HEIGHT - 40 } as const;
const COLUMNS = 5;
/** Back row first. Further back bottles are smaller, harder to ring and worth more. */
const ROWS = [
  { y: 140, scale: 0.7, catchRadius: 9, points: 30 },
  { y: 210, scale: 0.85, catchRadius: 11, points: 20 },
  { y: 280, scale: 1, catchRadius: 13, points: 10 },
];

export interface Bottle {
  /** Where the neck is: a ring has to land here to score. */
  x: number;
  y: number;
  scale: number;
  catchRadius: number;
  points: number;
  ringed: boolean;
}

export interface Ring {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Seconds since the throw. */
  age: number;
}

export interface Landing {
  x: number;
  y: number;
  /** The bottle the ring landed on, if any. */
  bottle?: Bottle;
  age: number;
}

export interface RingTossState {
  bottles: Bottle[];
  rings: Ring[];
  landings: Landing[];
  ringsLeft: number;
  score: number;
  /** Seconds since the round started; drives the hand's wobble. */
  time: number;
  phase: 'playing' | 'over';
}

export function createState(): RingTossState {
  const spacing = 110;
  const left = WIDTH / 2 - (spacing * (COLUMNS - 1)) / 2;
  const bottles = ROWS.flatMap((row) =>
    Array.from({ length: COLUMNS }, (_, i) => ({
      x: left + spacing * i,
      y: row.y,
      scale: row.scale,
      catchRadius: row.catchRadius,
      points: row.points,
      ringed: false,
    })),
  );
  return {
    bottles,
    rings: [],
    landings: [],
    ringsLeft: RINGS_PER_ROUND,
    score: 0,
    time: 0,
    phase: 'playing',
  };
}

/** How far the hand has drifted from the aim at `time` seconds. */
export function wobbleAt(time: number): number {
  return Math.sin(time * 2.5) * WOBBLE;
}

/** The bottle a ring landing at (x, y) goes over, if any. A bottle holds one ring. */
export function bottleAt(bottles: readonly Bottle[], x: number, y: number): Bottle | undefined {
  return bottles.find((b) => !b.ringed && Math.hypot(x - b.x, y - b.y) <= b.catchRadius);
}

/** Throws one ring towards the aim, give or take the wobble. Returns false if nothing was thrown. */
export function toss(state: RingTossState, aimX: number, aimY: number): boolean {
  if (state.phase !== 'playing' || state.ringsLeft === 0) return false;
  state.rings.push({
    fromX: THROWER.x,
    fromY: THROWER.y,
    toX: aimX + wobbleAt(state.time),
    toY: aimY,
    age: 0,
  });
  state.ringsLeft -= 1;
  return true;
}

/** Where a ring is in the air: a straight line from the thrower, lifted into an arc. */
export function ringPosition(ring: Ring): { x: number; y: number } {
  const t = Math.min(ring.age / FLIGHT_TIME, 1);
  const lift = Math.sin(t * Math.PI) * 120;
  return {
    x: ring.fromX + (ring.toX - ring.fromX) * t,
    y: ring.fromY + (ring.toY - ring.fromY) * t - lift,
  };
}

/** Advances the game by `dt` seconds. */
export function step(state: RingTossState, dt: number): void {
  state.time += dt;

  const flying: Ring[] = [];
  for (const ring of state.rings) {
    ring.age += dt;
    if (ring.age < FLIGHT_TIME) {
      flying.push(ring);
      continue;
    }
    const bottle = bottleAt(state.bottles, ring.toX, ring.toY);
    if (bottle) {
      bottle.ringed = true;
      state.score += bottle.points;
    }
    state.landings.push({ x: ring.toX, y: ring.toY, bottle, age: 0 });
  }
  state.rings = flying;

  for (const landing of state.landings) landing.age += dt;
  // Rings that missed fall away; rings on a bottle stay there.
  state.landings = state.landings.filter((l) => l.bottle || l.age < 0.5);

  if (state.ringsLeft === 0 && state.rings.length === 0) state.phase = 'over';
}

function drawRing(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.strokeStyle = theme.colors.accent;
  ctx.lineWidth = 4 * scale;
  ctx.beginPath();
  ctx.ellipse(x, y, 16 * scale, 6 * scale, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawBottle(ctx: CanvasRenderingContext2D, bottle: Bottle) {
  const { colors } = theme;
  const s = bottle.scale;
  // Neck at (x, y), body below it.
  ctx.fillStyle = colors.water;
  ctx.fillRect(bottle.x - 5 * s, bottle.y - 6 * s, 10 * s, 26 * s);
  ctx.beginPath();
  ctx.ellipse(bottle.x, bottle.y + 40 * s, 18 * s, 24 * s, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = colors.stripeB;
  ctx.fillRect(bottle.x - 6 * s, bottle.y - 9 * s, 12 * s, 5 * s);
}

function draw(ctx: CanvasRenderingContext2D, state: RingTossState, aim: { x: number; y: number }) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // A shelf under each row of bottles.
  for (const row of ROWS) {
    ctx.fillStyle = colors.wood;
    ctx.fillRect(60, row.y + 64 * row.scale, WIDTH - 120, 8);
  }

  for (const bottle of state.bottles) drawBottle(ctx, bottle);

  for (const landing of state.landings) {
    if (landing.bottle) {
      drawRing(
        ctx,
        landing.bottle.x,
        landing.bottle.y + 6 * landing.bottle.scale,
        landing.bottle.scale,
      );
    } else {
      ctx.globalAlpha = 1 - landing.age / 0.5;
      drawRing(ctx, landing.x, landing.y + landing.age * 120, 1);
      ctx.globalAlpha = 1;
    }
  }

  for (const ring of state.rings) {
    const { x, y } = ringPosition(ring);
    drawRing(ctx, x, y, 1.2);
  }

  // Where the next ring would land, wobble included.
  if (state.phase === 'playing' && state.ringsLeft > 0) {
    const x = aim.x + wobbleAt(state.time);
    ctx.strokeStyle = colors.muted;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, aim.y);
    ctx.lineTo(x + 8, aim.y);
    ctx.moveTo(x, aim.y - 8);
    ctx.lineTo(x, aim.y + 8);
    ctx.stroke();
    drawRing(ctx, THROWER.x, THROWER.y, 1.2);
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'left';
  ctx.fillText(`Score ${state.score}`, 16, HEIGHT - 20);
  ctx.textAlign = 'right';
  ctx.fillText(`Rings ${state.ringsLeft}/${RINGS_PER_ROUND}`, WIDTH - 16, HEIGHT - 20);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Out of rings! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const ringToss: CarnivalGame = {
  id: 'ring-toss',
  name: 'Ring Toss',
  description: 'Land rings on the bottle necks. Bottles further back score more.',

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    const aim = { x: WIDTH / 2, y: ROWS[1].y };

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => Object.assign(aim, toCanvas(event));
    const onDown = (event: PointerEvent) => {
      Object.assign(aim, toCanvas(event));
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
      } else {
        toss(state, aim.x, aim.y);
      }
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(ringToss.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aim);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
    };
  },
};

export default ringToss;
