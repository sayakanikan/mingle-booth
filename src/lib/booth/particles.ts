interface Particle {
  x: number;
  y: number;
  size: number;
  speedY: number;
  speedX: number;
  opacity: number;
  color: string;
  twinkle: number;
}

let animId: number | null = null;
const particles: Particle[] = [];

function createParticle(canvas: HTMLCanvasElement, forceBottom = false): Particle {
  const colors = [
    'rgba(192,132,252,', // purple
    'rgba(244,114,182,', // pink
    'rgba(56,189,248,',  // sky
    'rgba(251,191,36,',  // gold
  ];
  const c = colors[Math.floor(Math.random() * colors.length)];

  return {
    x: Math.random() * (canvas ? canvas.width : window.innerWidth),
    y: forceBottom ? (canvas ? canvas.height : window.innerHeight) + 10 : Math.random() * (canvas ? canvas.height : window.innerHeight),
    size: Math.random() * 3 + 1,
    speedY: -(Math.random() * 0.5 + 0.2),
    speedX: (Math.random() - 0.5) * 0.3,
    opacity: Math.random() * 0.6 + 0.1,
    color: c,
    twinkle: Math.random() * Math.PI * 2,
  };
}

function loop(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.twinkle += 0.03;
    const alpha = p.opacity * (0.6 + 0.4 * Math.sin(p.twinkle));

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = p.color + alpha + ')';
    ctx.fill();

    p.x += p.speedX;
    p.y += p.speedY;

    if (p.y < -10) {
      particles[i] = createParticle(canvas, true);
    }
  }

  animId = requestAnimationFrame(() => loop(canvas, ctx));
}

export function initParticles(canvas: HTMLCanvasElement) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  particles.length = 0;
  for (let i = 0; i < 60; i++) {
    particles.push(createParticle(canvas));
  }

  const ctx = canvas.getContext('2d')!;
  loop(canvas, ctx);

  const onResize = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', onResize);

  return () => {
    stopParticles();
    window.removeEventListener('resize', onResize);
  };
}

export function stopParticles() {
  if (animId) {
    cancelAnimationFrame(animId);
    animId = null;
  }
}
