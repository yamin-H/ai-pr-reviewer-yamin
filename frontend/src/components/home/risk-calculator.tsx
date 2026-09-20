"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import gsap from "gsap";
import {
  ShieldAlert,
  ShieldCheck,
  FileCode,
  GitCommit,
  Layers,
  Sparkles,
  Check,
} from "lucide-react";

export function RiskCalculator() {
  const [linesOfCode, setLinesOfCode] = useState<number>(350);
  const [fileCount, setFileCount] = useState<number>(8);
  const [hasCriticalFiles, setHasCriticalFiles] = useState<boolean>(true);
  const [dismissalRate, setDismissalRate] = useState<number>(18);

  // Displayed (animated) score
  const [displayScore, setDisplayScore] = useState<number>(0);
  const scoreAnimRef = useRef<gsap.core.Tween | null>(null);
  const scoreDisplayObj = useRef({ val: 0 });

  // Displayed (animated) breakdown values
  const displayDiffRef = useRef<HTMLSpanElement>(null);
  const displayFileRef = useRef<HTMLSpanElement>(null);
  const displayCritRef = useRef<HTMLSpanElement>(null);
  const displayDismissRef = useRef<HTMLSpanElement>(null);
  const displayTotalRef = useRef<HTMLSpanElement>(null);

  // Gauge ref
  const gaugeCircleRef = useRef<SVGCircleElement>(null);

  // Exact reproduction of Tier 3 Feature 1 Python algorithm in score_risk.py:
  const diffScore = Math.min(30, Math.round((linesOfCode / 1000) * 30));
  const fileScore = Math.min(20, Math.round((fileCount / 20) * 20));
  const criticalScore = hasCriticalFiles ? 35 : 0;
  const dismissalScore = Math.round((dismissalRate / 100) * 15);
  const totalScore = Math.min(100, diffScore + fileScore + criticalScore + dismissalScore);

  const isLow = totalScore < 30;
  const isHigh = totalScore > 70;
  const isMed = !isLow && !isHigh;

  const statusLabel = isLow ? "Low Risk" : isMed ? "Elevated Risk" : "Critical Risk";
  const ghState = isLow ? "success" : isMed ? "neutral" : "failure";

  const gaugeColor = isLow ? "#10B981" : isMed ? "#F59E0B" : "#EF4444";
  const statusTextColor = isLow ? "text-emerald-600" : isMed ? "text-amber-600" : "text-red-600";
  const statusBg = isLow ? "bg-emerald-50 border-emerald-200 text-emerald-700" : isMed ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-red-50 border-red-200 text-red-700";

  const circumference = 2 * Math.PI * 72;

  // Animate gauge and score counter whenever totalScore changes
  useEffect(() => {
    // Kill previous tween
    scoreAnimRef.current?.kill();

    const targetDashOffset = circumference * (1 - totalScore / 100);

    // GSAP tween for the SVG gauge arc
    if (gaugeCircleRef.current) {
      gsap.to(gaugeCircleRef.current, {
        strokeDashoffset: targetDashOffset,
        duration: 0.7,
        ease: "power2.out",
      });
    }

    // GSAP tween for the score number counter
    const startVal = scoreDisplayObj.current.val;
    scoreAnimRef.current = gsap.to(scoreDisplayObj.current, {
      val: totalScore,
      duration: 0.6,
      ease: "power2.out",
      onUpdate: () => {
        setDisplayScore(Math.round(scoreDisplayObj.current.val));
      },
    });

    // Animate breakdown numbers too
    const animRef = (el: HTMLSpanElement | null, target: number, suffix = "pt") => {
      if (!el) return;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: target,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => { el.textContent = Math.round(obj.val) + suffix; },
      });
    };

    animRef(displayDiffRef.current, diffScore);
    animRef(displayFileRef.current, fileScore);
    animRef(displayCritRef.current, criticalScore);
    animRef(displayDismissRef.current, dismissalScore);
  }, [totalScore, diffScore, fileScore, criticalScore, dismissalScore, circumference]);

  // Initialize gauge dasharray on mount
  useEffect(() => {
    if (gaugeCircleRef.current) {
      gaugeCircleRef.current.style.strokeDasharray = String(circumference);
      gaugeCircleRef.current.style.strokeDashoffset = String(circumference * (1 - totalScore / 100));
    }
    scoreDisplayObj.current.val = totalScore;
    setDisplayScore(totalScore);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-full bevel-card p-6 sm:p-8">
      <div className="bevel-chamfer-rail" />
      <div className="grid lg:grid-cols-12 gap-10 items-center">
        {/* Left: sliders */}
        <div className="lg:col-span-7 space-y-7">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-5 w-5 text-[#6D28D9] dark:text-[#A78BFA]" />
              <h3 className="text-[18px] font-display font-extrabold text-[#0F0F0F] dark:text-white tracking-tight">
                Interactive PR Risk Engine
              </h3>
            </div>
            <p className="text-[13px] text-[#4B5563] dark:text-zinc-400">
              Powerful scores pull requests based on diff surface area, AST criticality, and historical team dismissal rates. Adjust the parameters below to see the live score computation.
            </p>
          </div>

          <div className="space-y-6">
            {/* Slider 1: Diff Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#0F0F0F] dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-[#6D28D9] dark:text-[#A78BFA]" />
                  Diff Size (LOC Changed)
                </span>
                <span className="font-mono font-bold text-[#0F0F0F] dark:text-white">
                  {linesOfCode} lines ({diffScore}/30 pts)
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={1500}
                step={10}
                value={linesOfCode}
                onChange={(e) => setLinesOfCode(Number(e.target.value))}
                className="violet-range w-full"
              />
              <div className="flex justify-between text-[10px] text-[#9CA3AF] dark:text-zinc-500 font-mono">
                <span>10 LOC</span>
                <span>500 LOC</span>
                <span>1500+ LOC</span>
              </div>
            </div>

            {/* Slider 2: File Count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#0F0F0F] dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-[#6D28D9] dark:text-[#A78BFA]" />
                  Files Changed
                </span>
                <span className="font-mono font-bold text-[#0F0F0F] dark:text-white">
                  {fileCount} files ({fileScore}/20 pts)
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={fileCount}
                onChange={(e) => setFileCount(Number(e.target.value))}
                className="violet-range w-full"
              />
              <div className="flex justify-between text-[10px] text-[#9CA3AF] dark:text-zinc-500 font-mono">
                <span>1 file</span>
                <span>15 files</span>
                <span>30 files</span>
              </div>
            </div>

            {/* Toggle: Critical Files */}
            <div className="flex items-center justify-between p-4 rounded-xl bevel-recessed">
              <div>
                <span className="text-[13px] font-semibold text-[#0F0F0F] dark:text-white block">
                  Critical Path Impact (Auth / Database / Payments)
                </span>
                <span className="text-[11px] text-[#4B5563] dark:text-zinc-400">
                  Matches patterns in{" "}
                  <code className="text-[#6D28D9] dark:text-[#A78BFA] font-mono bg-violet-50 dark:bg-violet-950/40 px-1 rounded">src/auth/*</code>,{" "}
                  <code className="text-[#6D28D9] dark:text-[#A78BFA] font-mono bg-violet-50 dark:bg-violet-950/40 px-1 rounded">prisma/schema</code>, or{" "}
                  <code className="text-[#6D28D9] dark:text-[#A78BFA] font-mono bg-violet-50 dark:bg-violet-950/40 px-1 rounded">stripe/*</code>
                </span>
              </div>
              <button
                onClick={() => setHasCriticalFiles(!hasCriticalFiles)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer flex-shrink-0 ml-4 ${
                  hasCriticalFiles ? "bg-[#6D28D9]" : "bg-[#E5E7EB] dark:bg-white/20"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                    hasCriticalFiles ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Slider 3: Dismissal Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-[#0F0F0F] dark:text-zinc-200 font-medium flex items-center gap-1.5">
                  <GitCommit className="h-3.5 w-3.5 text-[#6D28D9] dark:text-[#A78BFA]" />
                  Team Historical Dismissal Rate
                </span>
                <span className="font-mono font-bold text-[#0F0F0F] dark:text-white">
                  {dismissalRate}% ({dismissalScore}/15 pts)
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={2}
                value={dismissalRate}
                onChange={(e) => setDismissalRate(Number(e.target.value))}
                className="violet-range w-full"
              />
              <div className="flex justify-between text-[10px] text-[#9CA3AF] dark:text-zinc-500 font-mono">
                <span>0% (High team trust)</span>
                <span>50%</span>
                <span>100% (High noise)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: gauge + GitHub check */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 sm:p-7 bevel-recessed space-y-6">
          {/* Circular SVG gauge */}
          <div className="relative flex items-center justify-center">
            <svg className="w-44 h-44 -rotate-90" viewBox="0 0 176 176">
              {/* Track */}
              <circle
                cx="88"
                cy="88"
                r="72"
                strokeWidth="10"
                fill="transparent"
                className="stroke-[#E5E7EB] dark:stroke-white/10 transition-colors duration-300"
              />
              {/* Animated arc — GSAP controlled */}
              <circle
                ref={gaugeCircleRef}
                cx="88"
                cy="88"
                r="72"
                stroke={gaugeColor}
                strokeWidth="10"
                strokeLinecap="round"
                fill="transparent"
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: circumference * (1 - totalScore / 100),
                  transition: "stroke 0.3s ease",
                }}
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className={`text-4xl font-extrabold tracking-tight font-mono ${statusTextColor}`}>
                {displayScore}
              </span>
              <span className="text-[10px] uppercase font-bold text-[#9CA3AF] dark:text-zinc-500 tracking-wider mt-0.5">
                out of 100
              </span>
              <span className={`mt-2 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusBg}`}>
                {statusLabel}
              </span>
            </div>
          </div>

          {/* GitHub commit status mock */}
          <div className="w-full rounded-xl border border-zinc-200/90 dark:border-white/10 bg-white dark:bg-[#0D1322] p-3.5 space-y-2 shadow-[inset_0_1px_0_0_#FFFFFF,0_1px_2px_0_rgba(15,23,42,0.05)] dark:shadow-none transition-colors duration-300">
            <div className="flex items-center justify-between text-[11px] text-[#4B5563] dark:text-zinc-400 font-mono pb-2.5 border-b border-[#E5E7EB] dark:border-white/10">
              <span className="flex items-center gap-1.5 text-[#0F0F0F] dark:text-white font-semibold">
                <GitCommit className="h-3.5 w-3.5 text-[#6D28D9] dark:text-[#A78BFA]" />
                GitHub Commit Status
              </span>
              <span>context: powerful/risk</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                    isLow ? "bg-emerald-500" : isMed ? "bg-amber-500" : "bg-red-500"
                  }`}
                >
                  {isLow ? <Check className="h-3 w-3 stroke-[3]" /> : "!"}
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#0F0F0F] dark:text-white">
                    Powerful — PR Risk: {displayScore}/100 ({statusLabel})
                  </p>
                  <p className="text-[10px] text-[#4B5563] dark:text-zinc-400">
                    {isLow
                      ? "Clean diff surface. Ready for standard review."
                      : isMed
                      ? "Moderate risk. Sensitive paths touched."
                      : "High risk! Lead engineer review required before merge."}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-[#9CA3AF] dark:text-zinc-500 flex-shrink-0">
                {ghState.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="w-full grid grid-cols-4 gap-1 text-center text-[10px] font-mono text-[#4B5563] dark:text-zinc-400 pt-2 border-t border-[#E5E7EB] dark:border-white/10 transition-colors duration-300">
            <div>
              <p className="text-[#0F0F0F] dark:text-white font-bold text-[13px]">
                <span ref={displayDiffRef}>{diffScore}pt</span>
              </p>
              <p className="text-[9px] text-[#9CA3AF] dark:text-zinc-500">Diff</p>
            </div>
            <div>
              <p className="text-[#0F0F0F] dark:text-white font-bold text-[13px]">
                <span ref={displayFileRef}>{fileScore}pt</span>
              </p>
              <p className="text-[9px] text-[#9CA3AF] dark:text-zinc-500">Files</p>
            </div>
            <div>
              <p className="text-[#0F0F0F] dark:text-white font-bold text-[13px]">
                <span ref={displayCritRef}>{criticalScore}pt</span>
              </p>
              <p className="text-[9px] text-[#9CA3AF] dark:text-zinc-500">Critical</p>
            </div>
            <div>
              <p className="text-[#0F0F0F] dark:text-white font-bold text-[13px]">
                <span ref={displayDismissRef}>{dismissalScore}pt</span>
              </p>
              <p className="text-[9px] text-[#9CA3AF] dark:text-zinc-500">Dismiss</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
