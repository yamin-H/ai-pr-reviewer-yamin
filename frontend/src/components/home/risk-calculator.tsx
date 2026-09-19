"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  FileCode,
  GitCommit,
  Layers,
  AlertTriangle,
  Sparkles,
  ExternalLink,
  Check,
} from "lucide-react";

export function RiskCalculator() {
  const [linesOfCode, setLinesOfCode] = useState<number>(350);
  const [fileCount, setFileCount] = useState<number>(8);
  const [hasCriticalFiles, setHasCriticalFiles] = useState<boolean>(true);
  const [dismissalRate, setDismissalRate] = useState<number>(18);

  // Exact reproduction of Tier 3 Feature 1 Python algorithm in score_risk.py:
  // 1. Diff size: 0-30 pts (min(30, round(lines / 1000 * 30)))
  const diffScore = Math.min(30, Math.round((linesOfCode / 1000) * 30));

  // 2. File count: 0-20 pts (min(20, round(files / 20 * 20)))
  const fileScore = Math.min(20, Math.round((fileCount / 20) * 20));

  // 3. Critical files: 0-35 pts
  const criticalScore = hasCriticalFiles ? 35 : 0;

  // 4. Team dismissal rate: 0-15 pts (round(rate / 100 * 15))
  const dismissalScore = Math.round((dismissalRate / 100) * 15);

  const totalScore = Math.min(100, diffScore + fileScore + criticalScore + dismissalScore);

  const isLow = totalScore < 30;
  const isHigh = totalScore > 70;
  const isMed = !isLow && !isHigh;

  const statusColor = isLow
    ? "text-emerald-400"
    : isMed
    ? "text-amber-400"
    : "text-red-400";

  const statusBg = isLow
    ? "bg-emerald-500/10 border-emerald-500/20"
    : isMed
    ? "bg-amber-500/10 border-amber-500/20"
    : "bg-red-500/10 border-red-500/20";

  const statusLabel = isLow
    ? "Low Risk"
    : isMed
    ? "Elevated Risk"
    : "Critical Risk";

  const ghState = isLow ? "success" : isMed ? "neutral" : "failure";

  return (
    <div className="w-full rounded-2xl border border-white/[0.08] bg-[#0A0D17]/85 backdrop-blur-xl p-6 sm:p-8 shadow-2xl">
      <div className="grid lg:grid-cols-12 gap-8 items-center">
        {/* Left Side: Interactive Sliders & Toggles */}
        <div className="lg:col-span-7 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="h-5 w-5 text-indigo-400" />
              <h3 className="text-lg font-bold text-white tracking-tight">
                Interactive PR Risk Engine
              </h3>
            </div>
            <p className="text-xs text-zinc-400">
              Powerful scores pull requests based on diff surface area, AST criticality, and historical team dismissal rates. Adjust the parameters below to see the live score computation.
            </p>
          </div>

          <div className="space-y-5">
            {/* Slider 1: Diff Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-indigo-400" />
                  Diff Size (LOC Changed)
                </span>
                <span className="font-mono font-bold text-white">
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
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>10 LOC</span>
                <span>500 LOC</span>
                <span>1500+ LOC</span>
              </div>
            </div>

            {/* Slider 2: File Count */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <FileCode className="h-3.5 w-3.5 text-indigo-400" />
                  Files Changed
                </span>
                <span className="font-mono font-bold text-white">
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
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>1 file</span>
                <span>15 files</span>
                <span>30 files</span>
              </div>
            </div>

            {/* Toggle: Critical Files */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-white/[0.08] bg-white/[0.02]">
              <div>
                <span className="text-xs font-semibold text-white block">
                  Critical Path Impact (Auth / Database / Payments)
                </span>
                <span className="text-[11px] text-zinc-400">
                  Matches patterns in <code className="text-indigo-300 font-mono">src/auth/*</code>, <code className="text-indigo-300 font-mono">prisma/schema</code>, or <code className="text-indigo-300 font-mono">stripe/*</code>
                </span>
              </div>
              <button
                onClick={() => setHasCriticalFiles(!hasCriticalFiles)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                  hasCriticalFiles ? "bg-indigo-600" : "bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    hasCriticalFiles ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            {/* Slider 3: Historical Team Dismissal Rate */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-300 font-medium flex items-center gap-1.5">
                  <GitCommit className="h-3.5 w-3.5 text-indigo-400" />
                  Team Historical Dismissal Rate
                </span>
                <span className="font-mono font-bold text-white">
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
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>0% (High team trust)</span>
                <span>50%</span>
                <span>100% (High noise)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Visual Gauge & GitHub Check Status Preview */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 rounded-xl border border-white/[0.08] bg-[#070A12] space-y-6">
          {/* Radial Circular Score Display */}
          <div className="relative flex items-center justify-center">
            {/* Ambient Back Glow */}
            <div
              className={`absolute inset-0 rounded-full blur-3xl opacity-30 ${
                isLow ? "bg-emerald-500" : isMed ? "bg-amber-500" : "bg-red-500"
              }`}
            />

            <svg className="w-44 h-44 transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="72"
                stroke="currentColor"
                strokeWidth="10"
                className="text-white/[0.06]"
                fill="transparent"
              />
              <motion.circle
                cx="88"
                cy="88"
                r="72"
                stroke="currentColor"
                strokeWidth="10"
                strokeDasharray={2 * Math.PI * 72}
                strokeDashoffset={2 * Math.PI * 72 * (1 - totalScore / 100)}
                strokeLinecap="round"
                className={`${statusColor} transition-all duration-500`}
                fill="transparent"
              />
            </svg>

            <div className="absolute flex flex-col items-center justify-center text-center">
              <motion.span
                key={totalScore}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-4xl font-extrabold text-white tracking-tight font-mono"
              >
                {totalScore}
              </motion.span>
              <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">
                out of 100
              </span>
              <span
                className={`mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${statusBg} ${statusColor}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>

          {/* GitHub Commit Status Check Live Mock */}
          <div className="w-full rounded-xl border border-white/[0.08] bg-[#0B0F1D] p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-zinc-400 font-mono pb-2 border-b border-white/[0.06]">
              <span className="flex items-center gap-1.5 text-white font-semibold">
                <GitCommit className="h-3.5 w-3.5 text-indigo-400" />
                GitHub Commit Status
              </span>
              <span>context: powerful/risk</span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2.5">
                <div
                  className={`h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold ${
                    isLow
                      ? "bg-emerald-500"
                      : isMed
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                >
                  {isLow ? <Check className="h-3 w-3 stroke-[3]" /> : "!"}
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Powerful — PR Risk: {totalScore}/100 ({statusLabel})
                  </p>
                  <p className="text-[10px] text-zinc-400">
                    {isLow
                      ? "Clean diff surface. Ready for standard review."
                      : isMed
                      ? "Moderate risk. Sensitive paths touched."
                      : "High risk! Lead engineer review required before merge."}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">
                {ghState.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Breakdown summary */}
          <div className="w-full grid grid-cols-4 gap-1 text-center text-[10px] font-mono text-zinc-400 pt-2 border-t border-white/[0.06]">
            <div>
              <p className="text-white font-bold">{diffScore}pt</p>
              <p className="text-[9px] text-zinc-500">Diff</p>
            </div>
            <div>
              <p className="text-white font-bold">{fileScore}pt</p>
              <p className="text-[9px] text-zinc-500">Files</p>
            </div>
            <div>
              <p className="text-white font-bold">{criticalScore}pt</p>
              <p className="text-[9px] text-zinc-500">Critical</p>
            </div>
            <div>
              <p className="text-white font-bold">{dismissalScore}pt</p>
              <p className="text-[9px] text-zinc-500">Dismiss</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
