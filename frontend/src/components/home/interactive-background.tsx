"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  originX: number;
  originY: number;
  radius: number;
  baseAlpha: number;
  color: string;
}

interface TrailSparkle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  hue: number;
}

interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
}

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Smooth interpolated mouse position
    const mouse = {
      x: width / 2,
      y: height / 3,
      targetX: width / 2,
      targetY: height / 3,
      isHovered: false,
      speed: 0,
      prevX: width / 2,
      prevY: height / 3,
    };

    // Color palette matching Powerful brand (Indigo, Violet, Cyan/Emerald)
    const PALETTE = [
      "rgba(99, 102, 241, ",  // Indigo
      "rgba(139, 92, 246, ",  // Violet
      "rgba(56, 189, 248, ",  // Cyan
      "rgba(16, 185, 129, ",  // Emerald
      "rgba(192, 132, 252, ", // Purple
    ];

    // Determine particle count based on screen area
    const particleCount = Math.min(
      Math.floor((width * height) / 14000),
      95
    );

    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const colorPrefix = PALETTE[Math.floor(Math.random() * PALETTE.length)];
      particles.push({
        x,
        y,
        originX: x,
        originY: y,
        vx: (Math.random() - 0.5) * 0.45,
        vy: (Math.random() - 0.5) * 0.45,
        radius: Math.random() * 1.8 + 1.2,
        baseAlpha: Math.random() * 0.45 + 0.25,
        color: colorPrefix,
      });
    }

    const sparkles: TrailSparkle[] = [];
    const shockwaves: Shockwave[] = [];

    // Resize handler
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });

    // Pointer move listener
    const handlePointerMove = (e: PointerEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isHovered = true;

      // Calculate speed
      const dx = mouse.targetX - mouse.prevX;
      const dy = mouse.targetY - mouse.prevY;
      mouse.speed = Math.sqrt(dx * dx + dy * dy);
      mouse.prevX = mouse.targetX;
      mouse.prevY = mouse.targetY;

      // Spawn trail sparkles when mouse moves with velocity
      if (mouse.speed > 2 && sparkles.length < 50) {
        const count = Math.min(Math.floor(mouse.speed / 4), 3);
        for (let i = 0; i < count; i++) {
          sparkles.push({
            x: mouse.targetX + (Math.random() - 0.5) * 16,
            y: mouse.targetY + (Math.random() - 0.5) * 16,
            vx: (Math.random() - 0.5) * 1.2 - dx * 0.05,
            vy: (Math.random() - 0.5) * 1.2 - dy * 0.05,
            alpha: 0.8,
            size: Math.random() * 2.5 + 1.2,
            hue: Math.random() > 0.5 ? 240 + Math.random() * 40 : 180 + Math.random() * 40,
          });
        }
      }
    };

    const handlePointerLeave = () => {
      mouse.isHovered = false;
    };

    // Click handler for interactive shockwave ripple
    const handleClick = (e: MouseEvent) => {
      shockwaves.push({
        x: e.clientX,
        y: e.clientY,
        radius: 10,
        maxRadius: 220,
        alpha: 0.7,
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerleave", handlePointerLeave, { passive: true });
    window.addEventListener("click", handleClick, { passive: true });

    // Render loop
    let lastTime = performance.now();

    const render = (time: number) => {
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      // Velvety smooth mouse interpolation (spring lerp)
      mouse.x += (mouse.targetX - mouse.x) * 0.075;
      mouse.y += (mouse.targetY - mouse.y) * 0.075;

      ctx.clearRect(0, 0, width, height);

      // 1. Draw Mouse-Driven Luminous Ambient Spotlight
      if (mouse.isHovered || true) {
        const glowRadius = 380;
        const radialGradient = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          glowRadius
        );
        radialGradient.addColorStop(0, "rgba(99, 102, 241, 0.11)");
        radialGradient.addColorStop(0.35, "rgba(139, 92, 246, 0.05)");
        radialGradient.addColorStop(0.7, "rgba(56, 189, 248, 0.015)");
        radialGradient.addColorStop(1, "rgba(0, 0, 0, 0)");

        ctx.fillStyle = radialGradient;
        ctx.fillRect(0, 0, width, height);
      }

      // 2. Render & Update Interactive Shockwaves
      for (let s = shockwaves.length - 1; s >= 0; s--) {
        const sw = shockwaves[s];
        sw.radius += 240 * dt;
        sw.alpha *= 0.95;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(129, 140, 248, ${sw.alpha * 0.5})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(sw.x, sw.y, Math.max(0, sw.radius - 8), 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(56, 189, 248, ${sw.alpha * 0.25})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();

        // Push particles caught in shockwave
        for (let i = 0; i < particles.length; i++) {
          const p = particles[i];
          const pdx = p.x - sw.x;
          const pdy = p.y - sw.y;
          const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (Math.abs(pdist - sw.radius) < 25 && pdist > 0) {
            const push = (1 - Math.abs(pdist - sw.radius) / 25) * 80 * dt;
            p.x += (pdx / pdist) * push;
            p.y += (pdy / pdist) * push;
          }
        }

        if (sw.radius >= sw.maxRadius || sw.alpha < 0.02) {
          shockwaves.splice(s, 1);
        }
      }

      // 3. Update & Draw Particles (Neural Vector Memory Nodes)
      const mouseInteractionRadius = 180;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Float motion
        p.x += p.vx;
        p.y += p.vy;

        // Bounce gently off canvas edges
        if (p.x < 0) {
          p.x = 0;
          p.vx *= -1;
        } else if (p.x > width) {
          p.x = width;
          p.vx *= -1;
        }
        if (p.y < 0) {
          p.y = 0;
          p.vy *= -1;
        } else if (p.y > height) {
          p.y = height;
          p.vy *= -1;
        }

        // Mouse displacement physics (satisfying organic parting force)
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouseInteractionRadius && dist > 0) {
          const force = (1 - dist / mouseInteractionRadius) * 2.8;
          p.x += (dx / dist) * force;
          p.y += (dy / dist) * force;

          // Interactive dynamic line to cursor
          const connectionAlpha = (1 - dist / mouseInteractionRadius) * 0.45;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.strokeStyle = `rgba(99, 102, 241, ${connectionAlpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        // Return slowly toward origin with gentle damping
        p.x += (p.originX - p.x) * 0.002;
        p.y += (p.originY - p.y) * 0.002;

        // Draw particle dot
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${p.baseAlpha})`;
        ctx.fill();

        // Subtle glow halo for larger nodes
        if (p.radius > 2.2) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${p.baseAlpha * 0.25})`;
          ctx.fill();
        }

        // Connect neighboring particles with neural network filaments
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const ndx = p.x - p2.x;
          const ndy = p.y - p2.y;
          const nDist = Math.sqrt(ndx * ndx + ndy * ndy);
          const maxLinkDist = 135;

          if (nDist < maxLinkDist) {
            const linkAlpha = (1 - nDist / maxLinkDist) * 0.16;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(129, 140, 248, ${linkAlpha})`;
            ctx.lineWidth = 0.75;
            ctx.stroke();
          }
        }
      }

      // 4. Update & Draw Dynamic Cursor Trail Sparkles
      for (let k = sparkles.length - 1; k >= 0; k--) {
        const sp = sparkles[k];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.alpha *= 0.94;
        sp.size *= 0.96;

        ctx.save();
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, Math.max(0.5, sp.size), 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${sp.hue}, 90%, 65%, ${sp.alpha})`;
        ctx.shadowColor = `hsla(${sp.hue}, 90%, 65%, 0.8)`;
        ctx.shadowBlur = 8;
        ctx.fill();
        ctx.restore();

        if (sp.alpha < 0.05 || sp.size < 0.4) {
          sparkles.splice(k, 1);
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerleave", handlePointerLeave);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      aria-hidden="true"
    />
  );
}
