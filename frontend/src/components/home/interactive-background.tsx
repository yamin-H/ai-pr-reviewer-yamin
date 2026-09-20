"use client";

import { useEffect, useRef } from "react";

interface Dot {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  radius: number;
  targetRadius: number;
  alpha: number;
  targetAlpha: number;
  hueProgress: number;
}

export function InteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    const GAP = 28; // Matches the editorial 28px dot grid
    const RADIUS = 160; // Influence radius around mouse

    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      isActive: false,
    };

    const initGrid = () => {
      dots = [];
      const cols = Math.ceil(width / GAP) + 2;
      const rows = Math.ceil(height / GAP) + 2;
      const offsetX = ((width % GAP) - GAP) / 2;
      const offsetY = ((height % GAP) - GAP) / 2;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = c * GAP + offsetX;
          const originY = r * GAP + offsetY;
          dots.push({
            originX,
            originY,
            x: originX,
            y: originY,
            vx: 0,
            vy: 0,
            targetX: originX,
            targetY: originY,
            radius: 1.2,
            targetRadius: 1.2,
            alpha: 0.35,
            targetAlpha: 0.35,
            hueProgress: 0,
          });
        }
      }
    };

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);

      initGrid();
    };

    handleResize();
    window.addEventListener("resize", handleResize, { passive: true });

    const onPointerMove = (e: PointerEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.isActive = true;
    };

    const onPointerLeave = () => {
      mouse.isActive = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.isActive = true;
      }
    };

    const onTouchEnd = () => {
      mouse.isActive = false;
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };

    let scrollY = window.scrollY;
    let targetScrollY = window.scrollY;

    const onScroll = () => {
      targetScrollY = window.scrollY;
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });

    const render = () => {
      // Fluid scroll velocity impulse
      const scrollDiff = targetScrollY - scrollY;
      scrollY += scrollDiff * 0.12;
      const scrollImpulse = Math.max(Math.min(scrollDiff * 0.04, 4), -4);

      // Fluid mouse position lerp
      if (mouse.isActive) {
        mouse.x += (mouse.targetX - mouse.x) * 0.12;
        mouse.y += (mouse.targetY - mouse.y) * 0.12;
      } else {
        mouse.x += (-1000 - mouse.x) * 0.08;
        mouse.y += (-1000 - mouse.y) * 0.08;
      }

      ctx.clearRect(0, 0, width, height);

      const isDark = document.documentElement.classList.contains("dark");
      const baseRadius = isDark ? 1.1 : 1.2;
      const baseAlpha = isDark ? 0.15 : 0.4;
      const radiusSq = RADIUS * RADIUS;

      // Draw subtle ambient cursor illumination torch behind dots
      if (mouse.x > -500 && mouse.x < width + 500 && mouse.y > -500 && mouse.y < height + 500) {
        const glowRadius = RADIUS * 1.5;
        const torch = ctx.createRadialGradient(
          mouse.x,
          mouse.y,
          0,
          mouse.x,
          mouse.y,
          glowRadius
        );

        if (isDark) {
          torch.addColorStop(0, "rgba(124, 58, 237, 0.08)");
          torch.addColorStop(0.5, "rgba(6, 182, 212, 0.03)");
          torch.addColorStop(1, "rgba(8, 12, 20, 0)");
        } else {
          torch.addColorStop(0, "rgba(109, 40, 217, 0.045)");
          torch.addColorStop(0.5, "rgba(8, 145, 178, 0.015)");
          torch.addColorStop(1, "rgba(250, 250, 250, 0)");
        }

        ctx.fillStyle = torch;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, glowRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      // Violet & Cyan palette definitions for proximity illumination
      const vR = isDark ? 124 : 109;
      const vG = isDark ? 58 : 40;
      const vB = isDark ? 237 : 217;

      const cR = isDark ? 6 : 8;
      const cG = isDark ? 182 : 145;
      const cB = isDark ? 212 : 178;

      // Update and render dots
      for (let i = 0; i < dots.length; i++) {
        const dot = dots[i];
        const dx = dot.originX - mouse.x;
        const dy = dot.originY - mouse.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < radiusSq) {
          const dist = Math.sqrt(distSq);
          const factor = 1 - dist / RADIUS;
          // Smooth quadratic push
          const push = factor * factor * 10;
          const angle = Math.atan2(dy, dx);

          dot.targetX = dot.originX + Math.cos(angle) * push;
          dot.targetY = dot.originY + Math.sin(angle) * push;
          dot.targetRadius = baseRadius + factor * 1.3;
          dot.targetAlpha = baseAlpha + factor * 0.55;
          // Gradient hue position across cursor footprint
          dot.hueProgress = Math.max(
            0,
            Math.min(1, (dot.originX - (mouse.x - RADIUS * 0.8)) / (RADIUS * 1.6))
          );
        } else {
          dot.targetX = dot.originX;
          dot.targetY = dot.originY;
          dot.targetRadius = baseRadius;
          dot.targetAlpha = baseAlpha;
        }

        // Elastic spring physics for smooth return with scroll wave momentum
        dot.vx += (dot.targetX - dot.x) * 0.2;
        dot.vy += (dot.targetY - dot.y) * 0.2 - scrollImpulse * 0.12;
        dot.vx *= 0.72;
        dot.vy *= 0.72;
        dot.x += dot.vx;
        dot.y += dot.vy;

        // Smooth size and opacity transitions
        dot.radius += (dot.targetRadius - dot.radius) * 0.2;
        dot.alpha += (dot.targetAlpha - dot.alpha) * 0.2;

        // Render dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);

        if (distSq < radiusSq * 1.2 && dot.alpha > baseAlpha + 0.05) {
          const r = Math.round(vR + (cR - vR) * dot.hueProgress);
          const g = Math.round(vG + (cG - vG) * dot.hueProgress);
          const b = Math.round(vB + (cB - vB) * dot.hueProgress);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${dot.alpha})`;
        } else {
          ctx.fillStyle = isDark
            ? `rgba(255, 255, 255, ${dot.alpha})`
            : `rgba(156, 163, 175, ${dot.alpha})`;
        }

        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <>
      {/* Interactive canvas dot-grid with subtle vignette mask */}
      <div
        aria-hidden="true"
        className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
        style={{
          maskImage:
            "radial-gradient(ellipse 85% 75% at 50% 35%, #000 45%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 85% 75% at 50% 35%, #000 45%, transparent 100%)",
        }}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>

      {/* Soft ambient top-left violet glow */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-0"
        style={{
          top: "-10%",
          left: "-5%",
          width: "50vw",
          height: "50vw",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(109,40,217,0.06) 0%, transparent 70%)",
        }}
      />
      {/* Soft ambient bottom-right cyan glow */}
      <div
        aria-hidden="true"
        className="fixed pointer-events-none z-0"
        style={{
          bottom: "0%",
          right: "-5%",
          width: "45vw",
          height: "45vw",
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(8,145,178,0.05) 0%, transparent 70%)",
        }}
      />
    </>
  );
}
