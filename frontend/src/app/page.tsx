"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Brain,
  GitPullRequest,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Code2,
  Check,
  ChevronRight,
  Copy,
  Terminal,
  Activity,
  Layers,
  FileCode,
  Lock,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { ReviewSimulator } from "@/components/home/review-simulator";
import { PipelineExplorer } from "@/components/home/pipeline-explorer";
import { RiskCalculator } from "@/components/home/risk-calculator";
import { ComparisonMatrix } from "@/components/home/comparison-matrix";
import { InteractiveBackground } from "@/components/home/interactive-background";
import { ThemeToggle } from "@/components/theme/theme-provider";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const SAMPLE_YAML = `# .powerful.yml — Declarative Repository Review Guidelines
rules:
  - "Never log raw bearer tokens or authorization headers in plain text"
  - "Always use parameterized Prisma.sql template tags for raw queries"
  - "Enforce limit pagination (max: 50) on public list endpoints"
  - "Require idempotent transaction wrappers on stripe webhook handlers"
`;

const BADGES = [
  { icon: Layers, label: "Linear LangGraph v0.2", color: "#6D28D9" },
  { icon: Brain, label: "PostgreSQL pgvector RAG", color: "#0891B2" },
  { icon: Sparkles, label: "Groq Llama 3.3 70B", color: "#6D28D9" },
  { icon: FileCode, label: ".powerful.yml Rule Engine", color: "#0891B2" },
  { icon: ShieldCheck, label: "Zero Hallucination AST Chunking", color: "#6D28D9" },
  { icon: Activity, label: "Avg Review Speed: 1.14s", color: "#0891B2" },
];

export default function Home() {
  const { user } = useAuth();
  const [copiedYaml, setCopiedYaml] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Refs for GSAP targets & scroll animations
  const mainRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const marqueeTrackRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const line1Ref = useRef<HTMLSpanElement>(null);
  const line2Ref = useRef<HTMLSpanElement>(null);
  const line3Ref = useRef<HTMLSpanElement>(null);
  const statReviewRef = useRef<HTMLSpanElement>(null);
  const statMemoryRef = useRef<HTMLSpanElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const terminalCodeRef = useRef<HTMLElement>(null);

  const handleCopyYaml = () => {
    navigator.clipboard.writeText(SAMPLE_YAML);
    setCopiedYaml(true);
    setTimeout(() => setCopiedYaml(false), 2000);
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 15);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();

    let isMounted = true;

    const ctx = gsap.context(() => {
      // ── 1. Top Viewport Scroll Progress Bar ──────────────────────────────
      if (progressBarRef.current) {
        gsap.to(progressBarRef.current, {
          scaleX: 1,
          ease: "none",
          scrollTrigger: {
            trigger: document.documentElement,
            start: "top top",
            end: "bottom bottom",
            scrub: 0.15,
          },
        });
      }

      // ── 2. Hero Headline Entrance ────────────────────────────────────────
      const animateHero = () => {
        if (!isMounted) return;
        if (line1Ref.current && line2Ref.current && line3Ref.current) {
          gsap.from([line1Ref.current, line2Ref.current, line3Ref.current], {
            y: 45,
            opacity: 1,
            stagger: 0.15,
            ease: "power3.out",
            duration: 0.85,
            clearProps: "transform",
          });
        }
      };

      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(animateHero);
      } else {
        animateHero();
      }

      // ── 3. Hero Scroll Parallax & Dissolve on Scroll Down ────────────────
      if (heroRef.current) {
        gsap.to(heroRef.current, {
          y: -40,
          opacity: 0.35,
          ease: "none",
          scrollTrigger: {
            trigger: heroRef.current,
            start: "center top",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }

      // ── 4. Marquee Extra Scroll Momentum ─────────────────────────────────
      if (marqueeTrackRef.current) {
        gsap.to(marqueeTrackRef.current, {
          x: -60,
          ease: "none",
          scrollTrigger: {
            trigger: marqueeTrackRef.current,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        });
      }

      // ── 5. Stats Bar Counter Animation ───────────────────────────────────
      if (statReviewRef.current) {
        gsap.to({ val: 0 }, {
          val: 1.14,
          duration: 1.6,
          ease: "power2.out",
          delay: 0.4,
          onUpdate: function () {
            if (statReviewRef.current) {
              statReviewRef.current.textContent = this.targets()[0].val.toFixed(2) + "s";
            }
          },
        });
      }

      if (statMemoryRef.current) {
        gsap.to({ val: 0 }, {
          val: 98.4,
          duration: 1.8,
          ease: "power2.out",
          delay: 0.6,
          onUpdate: function () {
            if (statMemoryRef.current) {
              statMemoryRef.current.textContent = this.targets()[0].val.toFixed(1) + "%";
            }
          },
        });
      }

      // ── 6. Section Content Scroll Reveals ────────────────────────────────
      const revealElements = mainRef.current?.querySelectorAll("[data-reveal]");
      revealElements?.forEach((element) => {
        gsap.fromTo(
          element,
          {
            y: 45,
            opacity: 0,
          },
          {
            y: 0,
            opacity: 1,
            duration: 0.85,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 85%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // ── 7. Accent Line Laser Unfurl on Scroll ───────────────────────────
      const accentLines = mainRef.current?.querySelectorAll(".accent-line");
      accentLines?.forEach((line) => {
        gsap.fromTo(
          line,
          {
            scaleX: 0,
            opacity: 0,
          },
          {
            scaleX: 1,
            opacity: 1,
            duration: 0.7,
            ease: "power2.out",
            scrollTrigger: {
              trigger: line,
              start: "top 88%",
              toggleActions: "play none none reverse",
            },
          }
        );
      });

      // ── 8. Terminal Typewriter on .powerful.yml section ──────────────────
      if (terminalCodeRef.current) {
        const lines = SAMPLE_YAML.split("\n");
        terminalCodeRef.current.textContent = "";
        ScrollTrigger.create({
          trigger: terminalCodeRef.current,
          start: "top 75%",
          once: true,
          onEnter: () => {
            const el = terminalCodeRef.current;
            if (!el) return;
            let full = "";
            let lineIdx = 0;
            let charIdx = 0;
            const tick = () => {
              if (lineIdx >= lines.length) return;
              const line = lines[lineIdx];
              if (charIdx < line.length) {
                full += line[charIdx];
                charIdx++;
              } else {
                full += "\n";
                lineIdx++;
                charIdx = 0;
              }
              el.textContent = full;
              if (lineIdx < lines.length) {
                gsap.delayedCall(0.018, tick);
              }
            };
            tick();
          },
        });
      }
    }, mainRef);

    return () => {
      isMounted = false;
      window.removeEventListener("scroll", handleScroll);
      ctx.revert();
    };
  }, []);

  return (
    <div ref={mainRef} className="relative min-h-screen bg-[#FAFAFA] dark:bg-[#080C14] text-[#0F0F0F] dark:text-zinc-100 overflow-x-hidden transition-colors duration-300">
      {/* ── VIEWPORT SCROLL PROGRESS BAR ───────────────────────────────── */}
      <div
        ref={progressBarRef}
        className="fixed top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-[#6D28D9] via-[#8B5CF6] to-[#0891B2] z-50 origin-left pointer-events-none shadow-[0_0_8px_rgba(109,40,217,0.7)]"
        style={{ transform: "scaleX(0)" }}
      />

      <InteractiveBackground />

      {/* ── TOP STATS TICKER ───────────────────────────────────────────── */}
      <div className="relative z-30 border-b border-zinc-200/60 dark:border-white/[0.06] bg-white/70 dark:bg-[#070B12]/80 backdrop-blur-md px-4 sm:px-6 py-1.5 transition-colors duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
          <div className="flex items-center gap-4 sm:gap-6 overflow-x-auto py-0.5 no-scrollbar">
            <span className="flex items-center gap-2 font-medium shrink-0 text-zinc-900 dark:text-zinc-100">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Engine v2.0 Operational
            </span>
            <span className="hidden sm:inline-block text-zinc-300 dark:text-zinc-700">|</span>
            <span className="shrink-0 flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <Activity className="h-3 w-3 text-[#6D28D9] dark:text-[#A78BFA]" />
              Avg Review Speed:{" "}
              <strong className="text-[#6D28D9] dark:text-[#A78BFA] ml-0.5 font-semibold">
                <span ref={statReviewRef}>1.14s</span>
              </strong>
            </span>
            <span className="hidden md:inline-block text-zinc-300 dark:text-zinc-700">|</span>
            <span className="shrink-0 hidden md:flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <Brain className="h-3 w-3 text-[#6D28D9] dark:text-[#A78BFA]" />
              Recall Accuracy:{" "}
              <strong className="text-[#6D28D9] dark:text-[#A78BFA] ml-0.5 font-semibold">
                <span ref={statMemoryRef}>98.4%</span>
              </strong>
            </span>
            <span className="hidden lg:inline-block text-zinc-300 dark:text-zinc-700">|</span>
            <span className="shrink-0 hidden lg:flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <ShieldCheck className="h-3 w-3 text-[#6D28D9] dark:text-[#A78BFA]" />
              Zero Hallucination AST
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <span className="inline-flex items-center gap-1 text-[10px] uppercase font-bold text-[#6D28D9] dark:text-[#A78BFA] bg-violet-500/[0.08] dark:bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">
              <Sparkles className="h-2.5 w-2.5" />
              Groq Llama 3.3 70B
            </span>
          </div>
        </div>
      </div>

      {/* ── NAVIGATION ─────────────────────────────────────────────────── */}
      <header
        ref={navRef}
        className={`sticky top-0 z-40 mx-auto w-full transition-all duration-300 ${
          isScrolled
            ? "border-b border-zinc-200/80 dark:border-white/[0.08] bg-white/90 dark:bg-[#080C14]/90 backdrop-blur-xl shadow-xs dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]"
            : "border-b border-zinc-200/40 dark:border-white/[0.05] bg-white/70 dark:bg-[#080C14]/70 backdrop-blur-md"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo Mark & Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6D28D9] via-[#7C3AED] to-[#0891B2] p-[1px] shadow-sm shadow-violet-500/20 group-hover:shadow-md group-hover:shadow-violet-500/30 transition-all duration-300">
              <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-zinc-950 dark:bg-[#080C14] transition-colors">
                <Zap className="h-4.5 w-4.5 text-violet-400 group-hover:scale-110 transition-transform duration-200" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[17px] font-bold tracking-tight text-zinc-950 dark:text-white">
                Powerful
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 text-[#6D28D9] dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/40">
                Agent v2
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links — Refined Pill Dock */}
          <nav className="hidden md:flex items-center gap-1 rounded-full border border-zinc-200/80 dark:border-white/[0.08] bg-zinc-100/60 dark:bg-white/[0.03] p-1 shadow-xs">
            <a
              href="#simulator"
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-xs transition-all duration-150"
            >
              Playground
            </a>
            <a
              href="#pipeline"
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-xs transition-all duration-150"
            >
              Architecture
            </a>
            <a
              href="#risk"
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-xs transition-all duration-150"
            >
              Risk Engine
            </a>
            <a
              href="#comparison"
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-xs transition-all duration-150"
            >
              Comparison
            </a>
            <a
              href="#quickstart"
              className="px-3.5 py-1.5 rounded-full text-[13px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white hover:bg-white dark:hover:bg-white/[0.08] hover:shadow-xs transition-all duration-150"
            >
              Configuration
            </a>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />

            <div className="h-4 w-px bg-zinc-200 dark:bg-white/10 hidden sm:block mx-0.5" />

            {user ? (
              <Link href="/dashboard">
                <Button
                  size="sm"
                  className="gap-2 h-9 px-4 text-xs font-semibold rounded-xl bg-[#6D28D9] hover:bg-[#5B21B6] text-white shadow-sm shadow-violet-500/20 hover:shadow-md hover:shadow-violet-500/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
                >
                  Open Dashboard
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            ) : (
              <Link href="/install">
                <Button
                  size="sm"
                  className="gap-2 h-9 px-4 text-xs font-semibold rounded-xl bg-gradient-to-r from-[#6D28D9] to-[#5B21B6] hover:from-[#5B21B6] hover:to-[#4C1D95] text-white shadow-sm shadow-violet-500/25 hover:shadow-md hover:shadow-violet-500/35 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-150"
                >
                  <GitPullRequest className="h-3.5 w-3.5" />
                  <span>Connect GitHub</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                </Button>
              </Link>
            )}

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden flex items-center justify-center h-9 w-9 rounded-xl border border-zinc-200/80 dark:border-white/10 bg-zinc-100/50 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Panel */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-zinc-200/80 dark:border-white/10 bg-white/95 dark:bg-[#080C14]/95 backdrop-blur-2xl px-6 py-5 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <a
              href="#simulator"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-[#6D28D9] dark:hover:text-violet-400 py-2 border-b border-zinc-100 dark:border-white/[0.04]"
            >
              <span>Interactive Playground</span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </a>
            <a
              href="#pipeline"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-[#6D28D9] dark:hover:text-violet-400 py-2 border-b border-zinc-100 dark:border-white/[0.04]"
            >
              <span>LangGraph Architecture</span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </a>
            <a
              href="#risk"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-[#6D28D9] dark:hover:text-violet-400 py-2 border-b border-zinc-100 dark:border-white/[0.04]"
            >
              <span>Risk Engine</span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </a>
            <a
              href="#comparison"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-[#6D28D9] dark:hover:text-violet-400 py-2 border-b border-zinc-100 dark:border-white/[0.04]"
            >
              <span>Why Powerful</span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </a>
            <a
              href="#quickstart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-[#6D28D9] dark:hover:text-violet-400 py-2"
            >
              <span>Configuration (.powerful.yml)</span>
              <ChevronRight className="h-3.5 w-3.5 text-zinc-400" />
            </a>

            <div className="pt-2">
              {user ? (
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-center gap-2 bg-[#6D28D9] hover:bg-[#5B21B6] text-white">
                    Open Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              ) : (
                <Link href="/install" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-center gap-2 bg-gradient-to-r from-[#6D28D9] to-[#5B21B6] text-white">
                    <GitPullRequest className="h-4 w-4" />
                    Connect GitHub
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative z-10 mx-auto max-w-7xl px-6 pt-20 pb-24 md:pt-28 md:pb-32 min-h-[90vh] flex flex-col justify-center"
      >
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center gap-8">
          {/* Label pill */}
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 dark:border-violet-800/40 bg-violet-50 dark:bg-violet-950/40 px-4 py-1.5 text-[12px] font-semibold text-[#6D28D9] dark:text-[#A78BFA]">
            <Zap className="h-3.5 w-3.5" />
            <span>Autonomous PR Review with Vector Memory Bank</span>
          </div>

          {/* Headline — 3 lines strictly stacked */}
          <h1 className="font-display text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] xl:text-[5.5rem] font-extrabold tracking-tight leading-[1.12] max-w-5xl mx-auto">
            <span ref={line1Ref} className="block text-[#0F0F0F] dark:text-white py-0.5">
              Code reviews that
            </span>
            <span
              ref={line2Ref}
              className="block py-0.5 hero-gradient-text"
              style={{
                background: "linear-gradient(90deg, #6D28D9, #0891B2)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                WebkitBoxDecorationBreak: "clone",
                boxDecorationBreak: "clone",
              }}
            >
              learn from your team&apos;s
            </span>
            <span ref={line3Ref} className="block text-[#0F0F0F] dark:text-white py-0.5">
              history.
            </span>
          </h1>

          {/* Sub-copy */}
          <p className="max-w-2xl text-[17px] text-[#4B5563] dark:text-zinc-400 leading-relaxed font-normal">
            Generic AI bots repeat the same dismissed nitpicks. Powerful stores approved feedback in an autonomous PostgreSQL pgvector Memory Bank, learns your codebase conventions, and scores pull requests before they merge.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 items-center pt-2">
            {user ? (
              <Link href="/dashboard">
                <Button
                  size="lg"
                  className="gap-2 text-sm bg-[#6D28D9] hover:bg-[#5B21B6] text-white shadow-md shadow-violet-200 dark:shadow-violet-950/50 px-7"
                >
                  Enter Engineering Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/install">
                  <Button
                    size="lg"
                    className="gap-2 text-sm bg-[#6D28D9] hover:bg-[#5B21B6] text-white shadow-md shadow-violet-200 dark:shadow-violet-950/50 px-7"
                  >
                    Install GitHub App
                    <GitPullRequest className="h-4 w-4" />
                  </Button>
                </Link>
                <a href="#simulator">
                  <Button
                    variant="secondary"
                    size="lg"
                    className="gap-2 text-sm bg-transparent hover:bg-[#0F0F0F] dark:hover:bg-white text-[#0F0F0F] dark:text-white hover:text-white dark:hover:text-[#080C14] border-[1.5px] border-[#0F0F0F] dark:border-white shadow-none px-7 transition-all duration-200"
                  >
                    Try Interactive Playground
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </a>
              </>
            )}
          </div>

          {/* Architecture badge marquee */}
          <div className="w-full overflow-hidden pt-10">
            <div ref={marqueeTrackRef} className="marquee-track">
              {[...BADGES, ...BADGES].map((badge, i) => {
                const Icon = badge.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-4 py-2 mx-2 rounded-xl border border-[#E5E7EB] dark:border-white/10 bg-white dark:bg-[#0D1322] shadow-sm text-[12px] font-mono text-[#4B5563] dark:text-zinc-300 shrink-0 transition-colors duration-300"
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: badge.color }} />
                    <span>{badge.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── INTERACTIVE PLAYGROUND ─────────────────────────────────────── */}
      <section
        id="simulator"
        className="relative z-10 bg-white dark:bg-[#0B0F1A] border-t border-[#E5E7EB] dark:border-white/10 scroll-mt-16 transition-colors duration-300"
      >
        <div className="mx-auto max-w-7xl px-6 section-pad">
          <div className="mb-12" data-reveal>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/30 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-4">
              <Sparkles className="h-3 w-3" />
              Interactive Playground
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0F0F0F] dark:text-white mb-4">
              Experience the Agent<br />in Action
            </h2>
            <div className="accent-line mb-4" />
            <p className="text-[15px] text-[#4B5563] dark:text-zinc-400 max-w-xl leading-relaxed">
              Choose a Pull Request diff below, click &quot;Simulate Review&quot;, and approve suggestions to see rules commit into the live memory bank.
            </p>
          </div>
          <div data-reveal>
            <ReviewSimulator />
          </div>
        </div>
      </section>

      {/* ── LANGGRAPH PIPELINE ─────────────────────────────────────────── */}
      <section
        id="pipeline"
        className="relative z-10 bg-[#FAFAFA] dark:bg-[#080C14] border-t border-[#E5E7EB] dark:border-white/10 scroll-mt-16 transition-colors duration-300"
      >
        <div className="mx-auto max-w-7xl px-6 section-pad">
          <div className="mb-12" data-reveal>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 text-[11px] font-semibold text-[#6D28D9] dark:text-[#A78BFA] mb-4">
              <Layers className="h-3 w-3" />
              Under the Hood
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0F0F0F] dark:text-white mb-4">
              Linear LangGraph<br />Architecture
            </h2>
            <div className="accent-line mb-4" />
            <p className="text-[15px] text-[#4B5563] dark:text-zinc-400 max-w-xl leading-relaxed">
              Every pull request passes through an 8-stage state machine that isolates context extraction, AST segmenting, pgvector search, and atomic GitHub dispatching.
            </p>
          </div>
          <div data-reveal>
            <PipelineExplorer />
          </div>
        </div>
      </section>

      {/* ── RISK ENGINE ────────────────────────────────────────────────── */}
      <section
        id="risk"
        className="relative z-10 bg-white dark:bg-[#0B0F1A] border-t border-[#E5E7EB] dark:border-white/10 scroll-mt-16 transition-colors duration-300"
      >
        <div className="mx-auto max-w-7xl px-6 section-pad">
          <div className="mb-12" data-reveal>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/30 text-[11px] font-semibold text-amber-700 dark:text-amber-400 mb-4">
              <ShieldCheck className="h-3 w-3" />
              Risk Prevention
            </div>
            <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0F0F0F] dark:text-white mb-4">
              Autonomous PR<br />Risk Scoring
            </h2>
            <div className="accent-line mb-4" />
            <p className="text-[15px] text-[#4B5563] dark:text-zinc-400 max-w-xl leading-relaxed">
              Adjust the diff size, file count, and historical team dismissal rates below to compute the live composite score and see the exact GitHub commit check status Powerful posts.
            </p>
          </div>
          <div data-reveal>
            <RiskCalculator />
          </div>
        </div>
      </section>

      {/* ── WHY POWERFUL ───────────────────────────────────────────────── */}
      <section
        id="comparison"
        className="relative z-10 bg-[#FAFAFA] dark:bg-[#080C14] border-t border-[#E5E7EB] dark:border-white/10 scroll-mt-16 transition-colors duration-300"
      >
        <div className="mx-auto max-w-7xl px-6 section-pad">
          <ComparisonMatrix />
        </div>
      </section>

      {/* ── .POWERFUL.YML QUICKSTART ────────────────────────────────────── */}
      <section
        id="quickstart"
        className="relative z-10 bg-white dark:bg-[#0B0F1A] border-t border-[#E5E7EB] dark:border-white/10 scroll-mt-16 transition-colors duration-300"
      >
        <div className="mx-auto max-w-7xl px-6 section-pad">
          <div className="grid lg:grid-cols-12 gap-16 items-start">
            {/* Left: editorial prose */}
            <div className="lg:col-span-6 space-y-8" data-reveal>
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 text-[11px] font-semibold text-[#6D28D9] dark:text-[#A78BFA] mb-4">
                  <FileCode className="h-3 w-3" />
                  Zero Configuration Drift
                </div>
                <h2 className="font-display text-4xl sm:text-5xl font-extrabold tracking-tight text-[#0F0F0F] dark:text-white leading-tight">
                  Declare Custom Standards in{" "}
                  <code className="font-mono text-[#6D28D9] dark:text-[#A78BFA]">.powerful.yml</code>
                </h2>
                <div className="accent-line mt-4" />
              </div>
              <p className="text-[15px] text-[#4B5563] dark:text-zinc-400 leading-relaxed">
                Store repository-specific guidelines right beside your code. Powerful reads your config on every Pull Request, merges them with historical team conventions from pgvector, and enforces them strictly.
              </p>

              <div className="space-y-4">
                {[
                  "Connect your GitHub personal account or team organization in one click.",
                  <>
                    Add a{" "}
                    <code className="font-mono text-[#6D28D9] dark:text-[#A78BFA] bg-violet-50 dark:bg-violet-950/40 px-1.5 py-0.5 rounded text-sm">
                      .powerful.yml
                    </code>{" "}
                    file to your repository root for custom rules.
                  </>,
                  "Open Pull Requests. The agent reviews in ~1.1s and gets smarter with every approved comment.",
                ].map((text, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="h-7 w-7 rounded-full bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800/40 flex items-center justify-center text-[#6D28D9] dark:text-[#A78BFA] shrink-0 font-bold text-sm mt-0.5">
                      {i + 1}
                    </div>
                    <span className="text-[14px] text-[#4B5563] dark:text-zinc-300 leading-relaxed pt-0.5">{text}</span>
                  </div>
                ))}
              </div>

              <Link href="/install">
                <Button
                  size="lg"
                  className="gap-2 text-sm bg-[#6D28D9] hover:bg-[#5B21B6] text-white shadow-sm shadow-violet-200 dark:shadow-violet-950/50 px-7"
                >
                  Get Started with GitHub
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Right: terminal code window */}
            <div className="lg:col-span-6" data-reveal>
              <div className="rounded-2xl overflow-hidden shadow-xl border border-[#2D2D3F]">
                {/* Terminal title bar */}
                <div className="flex items-center justify-between bg-[#1E1E2E] px-4 py-3 border-b border-[#2D2D3F]">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <span className="h-3 w-3 rounded-full bg-[#FF5F57]" />
                      <span className="h-3 w-3 rounded-full bg-[#FEBC2E]" />
                      <span className="h-3 w-3 rounded-full bg-[#28C840]" />
                    </div>
                    <span className="ml-2 text-[12px] font-mono text-[#6B7280]">
                      .powerful.yml
                    </span>
                  </div>
                  <button
                    onClick={handleCopyYaml}
                    className="flex items-center gap-1.5 text-[11px] text-[#6B7280] hover:text-white px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] transition-colors cursor-pointer"
                  >
                    {copiedYaml ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-400 font-semibold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy Config</span>
                      </>
                    )}
                  </button>
                </div>
                {/* Code body */}
                <div className="bg-[#1E1E2E] p-5">
                  <pre className="text-[13px] font-mono text-[#A6ACCD] leading-relaxed overflow-x-auto">
                    <code ref={terminalCodeRef}>{SAMPLE_YAML}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-zinc-200/80 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#05080F] transition-colors duration-300">
        {/* Pre-footer Status Ribbon */}
        <div className="border-b border-zinc-200/60 dark:border-white/[0.06] py-3 px-6">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono text-zinc-500 dark:text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-zinc-700 dark:text-zinc-300 font-medium">All Systems Operational</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>pgvector v0.8.0</span>
              <span className="text-zinc-300 dark:text-zinc-700">·</span>
              <span>AST Engine v2.0</span>
            </div>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Zero-Retention AST Sandboxing
              </span>
              <span className="hidden md:inline text-zinc-300 dark:text-zinc-700">·</span>
              <span className="hidden md:inline">SOC2 Type II Ready</span>
            </div>
          </div>
        </div>

        {/* Main Footer Sitemap Grid */}
        <div className="max-w-7xl mx-auto px-6 pt-16 pb-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 lg:gap-12">
            {/* Brand Column (5 cols on md/lg) */}
            <div className="md:col-span-4 lg:col-span-5 flex flex-col gap-4">
              <Link href="/" className="flex items-center gap-3 group w-fit">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-[#6D28D9] via-[#7C3AED] to-[#0891B2] p-[1px] shadow-sm shadow-violet-500/20 group-hover:shadow-md group-hover:shadow-violet-500/30 transition-all duration-300">
                  <div className="flex h-full w-full items-center justify-center rounded-[11px] bg-zinc-950 dark:bg-[#080C14] transition-colors">
                    <Zap className="h-4.5 w-4.5 text-violet-400 group-hover:scale-110 transition-transform duration-200" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-lg font-bold tracking-tight text-zinc-950 dark:text-white">
                    Powerful
                  </span>
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/50 text-[#6D28D9] dark:text-violet-300 border border-violet-200/80 dark:border-violet-800/40">
                    Agent v2
                  </span>
                </div>
              </Link>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-sm leading-relaxed font-normal">
                Autonomous PR reviewer that learns your team&apos;s conventions through PostgreSQL pgvector Memory Banks, scores risk before merge, and eliminates repetitive nitpicks.
              </p>
              <div className="pt-2 flex items-center gap-3">
                <Link href="/install">
                  <Button size="sm" className="gap-2 text-xs bg-[#6D28D9] hover:bg-[#5B21B6] text-white shadow-sm shadow-violet-500/20">
                    <GitPullRequest className="h-3.5 w-3.5" />
                    Install GitHub App
                  </Button>
                </Link>
                <Link href="/dashboard">
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs border-zinc-200 dark:border-white/10 hover:bg-zinc-100 dark:hover:bg-white/5">
                    Dashboard
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </div>

            {/* Nav Columns (7 cols on md/lg) */}
            <div className="md:col-span-8 lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
              {/* Column 1: Product */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 font-mono">
                  Product
                </h4>
                <ul className="flex flex-col gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <li>
                    <a href="#simulator" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      PR Simulator
                    </a>
                  </li>
                  <li>
                    <a href="#pipeline" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      LangGraph Pipeline
                    </a>
                  </li>
                  <li>
                    <a href="#risk" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      Risk Scoring Engine
                    </a>
                  </li>
                  <li>
                    <a href="#comparison" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      Why Powerful
                    </a>
                  </li>
                  <li>
                    <Link href="/dashboard/billing" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150 flex items-center gap-1.5">
                      Pricing & Quotas
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold">Free</span>
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 2: Architecture */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 font-mono">
                  Architecture
                </h4>
                <ul className="flex flex-col gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <li>
                    <a href="#quickstart" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      .powerful.yml Spec
                    </a>
                  </li>
                  <li>
                    <Link href="/dashboard/memory" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      pgvector Memory Bank
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/queue" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      BullMQ Worker Queue
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/usage" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      Token Telemetry
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/pipeline" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      AST Graph Visualizer
                    </Link>
                  </li>
                </ul>
              </div>

              {/* Column 3: Platform */}
              <div className="flex flex-col gap-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-900 dark:text-zinc-200 font-mono">
                  Platform
                </h4>
                <ul className="flex flex-col gap-2.5 text-sm text-zinc-600 dark:text-zinc-400">
                  <li>
                    <Link href="/install" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      Connect GitHub
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/repos" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      Repository Manager
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/reviews" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      Review Audit Log
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/digest" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      Weekly Digest
                    </Link>
                  </li>
                  <li>
                    <Link href="/dashboard/settings" className="hover:text-[#6D28D9] dark:hover:text-white transition-colors duration-150">
                      Organization Settings
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Bottom Bar Divider & Meta */}
          <div className="mt-14 pt-8 border-t border-zinc-200/70 dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 dark:text-zinc-500 font-mono">
            <p>
              &copy; {new Date().getFullYear()} Powerful. Built for high-velocity engineering teams.
            </p>
            <div className="flex items-center gap-6">
              <span className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer">
                Privacy Policy
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer">
                Terms of Service
              </span>
              <span className="hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors cursor-pointer">
                Security Architecture
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
