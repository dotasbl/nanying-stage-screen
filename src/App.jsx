import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

const NOTE_SYMBOLS = ["♪", "♫", "♬", "✦", "115", "南瀛"];
const DEFAULT_VISUAL_MODE = "staff";
const DEFAULT_QUALITY_MODE = "low";
const DEFAULT_STYLE_MODE = "stage";
const DEFAULT_ORGANIZER_SIZE = "small";
const APP_VERSION_LABEL = "v2026.05.11.7";
const AUDIO_ANALYSER_SMOOTHING = 0.48;
const WAVE_ATTACK_SMOOTHING = 0.68;
const WAVE_RELEASE_SMOOTHING = 0.24;
const QUALITY_OPTIONS = [
  {
    id: "low",
    name: "低畫質",
    shortName: "低",
    waveBarCount: 120,
    floatingScoreCount: 22,
    threeRenderFps: 24,
    audioReactionFps: 30,
    maxThreePixelRatio: 1.25,
  },
  {
    id: "high",
    name: "高畫質",
    shortName: "高",
    waveBarCount: 180,
    floatingScoreCount: 34,
    threeRenderFps: 60,
    audioReactionFps: 60,
    maxThreePixelRatio: 2,
  },
];
const MAX_WAVE_BAR_COUNT = Math.max(
  ...QUALITY_OPTIONS.map((quality) => quality.waveBarCount),
);
const MAX_FLOATING_SCORE_COUNT = Math.max(
  ...QUALITY_OPTIONS.map((quality) => quality.floatingScoreCount),
);
const VISUAL_OPTIONS = [
  { id: "trophy", name: "獎盃", icon: "cup" },
  { id: "staff", name: "五線譜", icon: "staff" },
  { id: "microphone", name: "金色麥克風", icon: "mic" },
  { id: "none", name: "關閉", icon: "none" },
];
const STYLE_OPTIONS = [
  { id: "stage", name: "舞台光束", shortName: "舞台" },
  { id: "cinematic", name: "電影星塵", shortName: "電影" },
];
const ORGANIZER_SIZE_OPTIONS = [
  { id: "small", name: "小", scale: 1 },
  { id: "medium", name: "中", scale: 1.2 },
  { id: "large", name: "大", scale: 1.5 },
];
const THEME_OPTIONS = [
  {
    id: "champion",
    name: "金獎典禮",
    swatch: "linear-gradient(135deg, #fff3b0, #f59e0b 48%, #7c2d12)",
    three: {
      primary: "#f8d16d",
      secondary: "#b86a1d",
      highlight: "#fff7c8",
      emissive: "#f59e0b",
    },
    vars: {
      "--stage-top-glow": "rgba(248, 207, 111, 0.26)",
      "--stage-left-glow": "rgba(148, 43, 38, 0.34)",
      "--stage-right-glow": "rgba(42, 85, 132, 0.3)",
      "--stage-base": "#030303",
      "--accent-rgb": "250, 204, 21",
      "--accent-soft-rgb": "245, 158, 11",
      "--accent-hot-rgb": "255, 247, 198",
      "--accent-deep-rgb": "180, 83, 34",
      "--beam-shadow-rgb": "180, 58, 49",
      "--trophy-halo": "rgba(250, 204, 21, 0.34)",
      "--title-gradient":
        "linear-gradient(100deg, #f7d77b 0%, #fff7ce 16%, #d59a2d 32%, #fff4bf 50%, #f7d77b 66%, #b97924 82%, #f7d77b 100%)",
      "--wave-cool-gradient":
        "linear-gradient(to top, rgba(180, 83, 34, 0.52), rgba(245, 197, 79, 0.78))",
      "--wave-hot-gradient":
        "linear-gradient(to top, rgba(224, 79, 49, 0.92), rgba(255, 248, 197, 1))",
      "--wave-cool-shadow": "0 0 8px rgba(245, 158, 11, 0.28)",
      "--wave-hot-shadow":
        "0 0 22px rgba(250, 204, 21, 0.88), 0 0 34px rgba(185, 28, 28, 0.38)",
    },
  },
  {
    id: "sapphire",
    name: "藍金星光",
    swatch: "linear-gradient(135deg, #bae6fd, #2563eb 48%, #0f172a)",
    three: {
      primary: "#d7ecff",
      secondary: "#3b82f6",
      highlight: "#fff7c8",
      emissive: "#38bdf8",
    },
    vars: {
      "--stage-top-glow": "rgba(147, 197, 253, 0.26)",
      "--stage-left-glow": "rgba(14, 165, 233, 0.22)",
      "--stage-right-glow": "rgba(250, 204, 21, 0.24)",
      "--stage-base": "#02040a",
      "--accent-rgb": "125, 211, 252",
      "--accent-soft-rgb": "59, 130, 246",
      "--accent-hot-rgb": "224, 242, 254",
      "--accent-deep-rgb": "30, 64, 175",
      "--beam-shadow-rgb": "29, 78, 216",
      "--trophy-halo": "rgba(125, 211, 252, 0.36)",
      "--title-gradient":
        "linear-gradient(100deg, #bfdbfe 0%, #fde68a 18%, #f8fafc 36%, #60a5fa 54%, #facc15 72%, #bfdbfe 100%)",
      "--wave-cool-gradient":
        "linear-gradient(to top, rgba(30, 64, 175, 0.54), rgba(125, 211, 252, 0.78))",
      "--wave-hot-gradient":
        "linear-gradient(to top, rgba(37, 99, 235, 0.92), rgba(255, 249, 196, 1))",
      "--wave-cool-shadow": "0 0 8px rgba(59, 130, 246, 0.3)",
      "--wave-hot-shadow":
        "0 0 22px rgba(125, 211, 252, 0.88), 0 0 34px rgba(250, 204, 21, 0.34)",
    },
  },
  {
    id: "rose",
    name: "玫瑰金聲浪",
    swatch: "linear-gradient(135deg, #ffe4e6, #f43f5e 48%, #3b0764)",
    three: {
      primary: "#ffd0aa",
      secondary: "#e11d48",
      highlight: "#fff1c2",
      emissive: "#fb7185",
    },
    vars: {
      "--stage-top-glow": "rgba(251, 113, 133, 0.24)",
      "--stage-left-glow": "rgba(168, 85, 247, 0.2)",
      "--stage-right-glow": "rgba(251, 191, 36, 0.24)",
      "--stage-base": "#070208",
      "--accent-rgb": "251, 113, 133",
      "--accent-soft-rgb": "244, 63, 94",
      "--accent-hot-rgb": "255, 241, 194",
      "--accent-deep-rgb": "136, 19, 55",
      "--beam-shadow-rgb": "157, 23, 77",
      "--trophy-halo": "rgba(251, 113, 133, 0.34)",
      "--title-gradient":
        "linear-gradient(100deg, #fecdd3 0%, #fbbf24 18%, #fff7ed 36%, #fb7185 54%, #fde68a 72%, #fecdd3 100%)",
      "--wave-cool-gradient":
        "linear-gradient(to top, rgba(136, 19, 55, 0.54), rgba(251, 113, 133, 0.78))",
      "--wave-hot-gradient":
        "linear-gradient(to top, rgba(225, 29, 72, 0.94), rgba(255, 241, 194, 1))",
      "--wave-cool-shadow": "0 0 8px rgba(244, 63, 94, 0.3)",
      "--wave-hot-shadow":
        "0 0 22px rgba(251, 113, 133, 0.9), 0 0 34px rgba(250, 204, 21, 0.3)",
    },
  },
];

const customStyles = `
  :root {
    color-scheme: dark;
  }

  @keyframes beam-sweep {
    0%, 100% { opacity: 0.22; transform: translateX(-8%) rotate(var(--beam-rotate)) scaleY(0.92); }
    50% { opacity: 0.78; transform: translateX(8%) rotate(calc(var(--beam-rotate) * -0.75)) scaleY(1.08); }
  }

  @keyframes ring-pulse {
    0%, 100% { opacity: var(--ring-opacity); transform: translate(-50%, -50%) scale(0.98) rotate(0deg); }
    50% { opacity: calc(var(--ring-opacity) + 0.22); transform: translate(-50%, -50%) scale(1.035) rotate(6deg); }
  }

  @keyframes ambient-breathe {
    0%, 100% {
      opacity: var(--ambient-low);
      transform: translate(var(--ambient-x), var(--ambient-y)) scale(0.96);
      filter: blur(var(--ambient-blur));
    }
    50% {
      opacity: var(--ambient-high);
      transform: translate(var(--ambient-x), var(--ambient-y)) scale(1.08);
      filter: blur(calc(var(--ambient-blur) * 1.18));
    }
  }

  @keyframes cinematic-slow-spin {
    0% { transform: translate(-50%, -50%) rotate(0deg) scale(1); }
    50% { transform: translate(-50%, -50%) rotate(180deg) scale(1.05); }
    100% { transform: translate(-50%, -50%) rotate(360deg) scale(1); }
  }

  @keyframes cinematic-slow-spin-reverse {
    from { transform: translate(-50%, -50%) rotate(360deg); }
    to { transform: translate(-50%, -50%) rotate(0deg); }
  }

  @keyframes cinematic-particle {
    0% { opacity: 0; transform: translateY(100vh) scale(1); }
    18% { opacity: var(--particle-opacity); }
    80% { opacity: calc(var(--particle-opacity) * 0.62); }
    100% { opacity: 0; transform: translateY(-18vh) scale(0.52); }
  }

  @keyframes trophy-halo {
    0%, 100% { opacity: 0.34; transform: scale(0.92); }
    50% { opacity: calc(0.62 + var(--sound-energy) * 0.22); transform: scale(calc(1.02 + var(--sound-energy) * 0.08)); }
  }

  @keyframes gold-shine {
    0% { background-position: 0% center; }
    100% { background-position: 100% center; }
  }

  @keyframes title-rise {
    0% { opacity: 0; transform: translateY(1.8vh) scale(0.992); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }

  @keyframes scan-pass {
    0% { transform: translateX(-120%) skewX(-18deg); opacity: 0; }
    18% { opacity: 0.8; }
    48% { opacity: 0.35; }
    100% { transform: translateX(220%) skewX(-18deg); opacity: 0; }
  }

  @keyframes score-float {
    0% { transform: translateY(110vh) translateX(0) scale(0.7); opacity: 0; }
    12% { opacity: 0.68; }
    50% { transform: translateY(46vh) translateX(var(--drift)) scale(1); opacity: 0.42; }
    100% { transform: translateY(-18vh) translateX(calc(var(--drift) * -0.45)) scale(1.38); opacity: 0; }
  }

  @keyframes floor-glide {
    0%, 100% { opacity: 0.2; }
    50% { opacity: 0.72; }
  }

  @keyframes staff-drift {
    from { transform: translateX(-18%); }
    to { transform: translateX(18%); }
  }

  @keyframes note-pulse {
    0%, 100% { opacity: 0.36; transform: translateY(0) scale(0.94); }
    50% { opacity: calc(0.72 + var(--sound-energy) * 0.2); transform: translateY(-3%) scale(calc(1.02 + var(--sound-energy) * 0.08)); }
  }

  @keyframes settings-panel-in {
    from { opacity: 0; transform: translateY(-8px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }

  .stage-shell {
    --sound-energy: 0;
    --bass-energy: 0;
    --title-energy: 0;
    --stage-top-glow: rgba(248, 207, 111, 0.26);
    --stage-left-glow: rgba(148, 43, 38, 0.34);
    --stage-right-glow: rgba(42, 85, 132, 0.3);
    --stage-base: #030303;
    --accent-rgb: 250, 204, 21;
    --accent-soft-rgb: 245, 158, 11;
    --accent-hot-rgb: 255, 247, 198;
    --accent-deep-rgb: 180, 83, 34;
    --beam-shadow-rgb: 180, 58, 49;
    --trophy-halo: rgba(250, 204, 21, 0.34);
    --title-gradient: linear-gradient(100deg, #f7d77b 0%, #fff7ce 16%, #d59a2d 32%, #fff4bf 50%, #f7d77b 66%, #b97924 82%, #f7d77b 100%);
    --wave-cool-gradient: linear-gradient(to top, rgba(180, 83, 34, 0.52), rgba(245, 197, 79, 0.78));
    --wave-hot-gradient: linear-gradient(to top, rgba(224, 79, 49, 0.92), rgba(255, 248, 197, 1));
    --wave-cool-shadow: 0 0 8px rgba(245, 158, 11, 0.28);
    --wave-hot-shadow: 0 0 22px rgba(250, 204, 21, 0.88), 0 0 34px rgba(185, 28, 28, 0.38);
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.54) 62%, #020202 100%),
      radial-gradient(ellipse at 50% 8%, var(--stage-top-glow), transparent 34%),
      radial-gradient(ellipse at 18% 92%, var(--stage-left-glow), transparent 38%),
      radial-gradient(ellipse at 82% 92%, var(--stage-right-glow), transparent 38%),
      var(--stage-base);
    transition: background 420ms ease;
  }

  .stage-shell::before {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(rgba(255, 255, 255, 0.032) 50%, rgba(0, 0, 0, 0) 50%),
      linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 100% 4px, 28px 100%;
    mix-blend-mode: screen;
    opacity: 0.45;
    pointer-events: none;
  }

  .stage-shell::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(90deg, rgba(0, 0, 0, 0.82) 0%, transparent 14%, transparent 86%, rgba(0, 0, 0, 0.82) 100%),
      radial-gradient(ellipse at center, transparent 48%, rgba(0, 0, 0, 0.68) 100%);
    pointer-events: none;
  }

  .stage-shell.is-cinematic-style {
    background:
      linear-gradient(180deg, rgba(0, 0, 0, 0.02) 0%, rgba(0, 0, 0, 0.68) 70%, #010101 100%),
      radial-gradient(ellipse at 50% 0%, rgba(var(--accent-hot-rgb), 0.42), transparent 46%),
      radial-gradient(ellipse at 50% 55%, rgba(var(--accent-rgb), 0.2), transparent 50%),
      radial-gradient(ellipse at 0% 100%, rgba(var(--accent-deep-rgb), 0.32), transparent 58%),
      radial-gradient(ellipse at 100% 100%, rgba(var(--accent-deep-rgb), 0.28), transparent 58%),
      #020202;
  }

  .stage-shell.is-cinematic-style::before {
    background:
      linear-gradient(rgba(255, 255, 255, 0) 50%, rgba(255, 255, 255, 0.026) 50%),
      radial-gradient(circle at 50% 50%, rgba(var(--accent-hot-rgb), 0.05), transparent 58%);
    background-size: 100% 4px, 100% 100%;
    opacity: 0.78;
  }

  .stage-shell.is-cinematic-style::after {
    background:
      linear-gradient(90deg, rgba(0, 0, 0, 0.62) 0%, transparent 18%, transparent 82%, rgba(0, 0, 0, 0.62) 100%),
      radial-gradient(ellipse at center, transparent 38%, rgba(0, 0, 0, 0.72) 100%);
  }

  .ambient-breathe {
    animation: ambient-breathe var(--ambient-speed) ease-in-out infinite;
    background: radial-gradient(ellipse at center, var(--ambient-color), transparent 70%);
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .reactive-center-glow {
    opacity: calc(0.22 + var(--bass-energy) * 0.65);
    transform: translate(-50%, -50%) scale(calc(0.92 + var(--bass-energy) * 0.42));
    filter: blur(calc(58px + var(--bass-energy) * 46px));
    background:
      radial-gradient(circle at 50% 50%, rgba(var(--accent-hot-rgb), 0.64), rgba(var(--accent-rgb), 0.34) 30%, rgba(var(--accent-deep-rgb), 0.12) 58%, transparent 72%);
    mix-blend-mode: screen;
    pointer-events: none;
    transition: opacity 80ms linear, transform 80ms linear, filter 80ms linear;
  }

  .stage-shell.is-cinematic-style .reactive-center-glow {
    opacity: calc(0.16 + var(--bass-energy) * 0.72);
    transform: translate(-50%, -50%) scale(calc(1 + var(--bass-energy) * 0.5));
    filter: blur(calc(88px + var(--bass-energy) * 62px));
    background:
      radial-gradient(circle at 50% 50%, rgba(var(--accent-hot-rgb), 0.72), rgba(var(--accent-rgb), 0.32) 34%, rgba(var(--accent-deep-rgb), 0.1) 62%, transparent 74%);
  }

  .cinematic-ring {
    position: absolute;
    left: 50%;
    top: 50%;
    border-radius: 50%;
    border: 1px solid rgba(var(--accent-rgb), 0.16);
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .cinematic-ring-a {
    width: 120%;
    height: 250%;
    border-width: 2px;
    opacity: 0.54;
    animation: cinematic-slow-spin 30s ease-in-out infinite;
  }

  .cinematic-ring-b {
    width: 90%;
    height: 180%;
    opacity: 0.74;
    border-color: rgba(var(--accent-hot-rgb), 0.2);
    animation: cinematic-slow-spin-reverse 40s linear infinite;
  }

  .cinematic-spotlight {
    position: absolute;
    pointer-events: none;
    mix-blend-mode: screen;
    animation: ambient-breathe var(--ambient-speed) ease-in-out infinite;
  }

  .cinematic-spotlight-top {
    inset: 0 auto auto 50%;
    width: 180%;
    height: 100%;
    transform: translateX(-50%);
    background: radial-gradient(ellipse at top, rgba(var(--accent-rgb), 0.42), transparent 70%);
    --ambient-x: -50%;
    --ambient-y: 0%;
    --ambient-low: 0.46;
    --ambient-high: 0.86;
    --ambient-blur: 0px;
    --ambient-speed: 8s;
  }

  .cinematic-spotlight-left {
    left: 0;
    bottom: 0;
    width: 90%;
    height: 80%;
    background: radial-gradient(ellipse at bottom left, rgba(var(--accent-deep-rgb), 0.34), transparent 60%);
    --ambient-x: 0%;
    --ambient-y: 0%;
    --ambient-low: 0.36;
    --ambient-high: 0.74;
    --ambient-blur: 0px;
    --ambient-speed: 8s;
    animation-delay: -2s;
  }

  .cinematic-spotlight-right {
    right: 0;
    bottom: 0;
    width: 90%;
    height: 80%;
    background: radial-gradient(ellipse at bottom right, rgba(var(--accent-deep-rgb), 0.32), transparent 60%);
    --ambient-x: 0%;
    --ambient-y: 0%;
    --ambient-low: 0.34;
    --ambient-high: 0.72;
    --ambient-blur: 0px;
    --ambient-speed: 8s;
    animation-delay: -4s;
  }

  .cinematic-particle {
    position: absolute;
    z-index: 1;
    border-radius: 999px;
    background: rgba(var(--accent-hot-rgb), 0.9);
    box-shadow: 0 0 8px rgba(var(--accent-rgb), 0.8);
    pointer-events: none;
    animation: cinematic-particle linear infinite;
  }

  .cinematic-lens-flare {
    background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255, 255, 255, 0.82) 0%, rgba(var(--accent-rgb), 0.34) 40%, transparent 100%);
    transform: translate(-50%, -50%) rotate(-8deg);
  }

  .trophy-scene {
    position: absolute;
    top: 9%;
    width: 15.5%;
    height: 72%;
    z-index: 7;
    pointer-events: none;
  }

  .trophy-scene-left {
    left: 0.6%;
  }

  .trophy-scene-right {
    right: 0.6%;
  }

  .trophy-scene canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 24px rgba(var(--accent-rgb), 0.36));
  }

  .trophy-halo {
    position: absolute;
    inset: 16% -26% 8%;
    border-radius: 999px;
    background: radial-gradient(ellipse at center, var(--trophy-halo), transparent 68%);
    filter: blur(22px);
    animation: trophy-halo 4.8s ease-in-out infinite;
    mix-blend-mode: screen;
  }

  .trophy-scene-right .trophy-halo {
    animation-delay: -2.4s;
  }

  .trophy-fallback {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 58%;
    height: 58%;
    transform: translate(-50%, -50%);
    opacity: 0.7;
    background:
      radial-gradient(ellipse at 50% 6%, rgba(var(--accent-hot-rgb), 0.96) 0 12%, transparent 13%),
      radial-gradient(ellipse at 50% 30%, rgba(var(--accent-rgb), 0.72) 0 28%, transparent 29%),
      linear-gradient(to bottom, transparent 43%, rgba(var(--accent-rgb), 0.8) 44% 68%, transparent 69%),
      radial-gradient(ellipse at 50% 82%, rgba(var(--accent-soft-rgb), 0.74) 0 32%, transparent 33%);
    clip-path: polygon(24% 0, 76% 0, 68% 42%, 58% 42%, 58% 72%, 82% 84%, 82% 100%, 18% 100%, 18% 84%, 42% 72%, 42% 42%, 32% 42%);
    filter: blur(0.2px) drop-shadow(0 0 18px rgba(var(--accent-rgb), 0.5));
  }

  .trophy-scene.has-webgl .trophy-fallback {
    opacity: 0;
  }

  .microphone-scene {
    position: absolute;
    top: 10%;
    width: 15%;
    height: 72%;
    z-index: 7;
    pointer-events: none;
  }

  .microphone-scene-left {
    left: 0.9%;
  }

  .microphone-scene-right {
    right: 0.9%;
  }

  .microphone-scene canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    filter: drop-shadow(0 0 24px rgba(var(--accent-rgb), 0.38));
  }

  .microphone-halo {
    position: absolute;
    inset: 14% -30% 6%;
    border-radius: 999px;
    background: radial-gradient(ellipse at center, rgba(var(--accent-rgb), 0.32), transparent 70%);
    filter: blur(24px);
    animation: trophy-halo 4.4s ease-in-out infinite;
    mix-blend-mode: screen;
  }

  .microphone-scene-right .microphone-halo {
    animation-delay: -2.2s;
  }

  .microphone-fallback {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 50%;
    height: 70%;
    transform: translate(-50%, -50%) rotate(-9deg);
    border-radius: 999px 999px 32% 32%;
    opacity: 0.72;
    background:
      repeating-linear-gradient(90deg, rgba(var(--accent-hot-rgb), 0.88) 0 2px, rgba(var(--accent-deep-rgb), 0.28) 2px 5px),
      linear-gradient(to bottom, rgba(var(--accent-hot-rgb), 0.92), rgba(var(--accent-rgb), 0.74) 35%, rgba(var(--accent-soft-rgb), 0.82) 100%);
    clip-path: polygon(24% 0, 76% 0, 90% 16%, 78% 42%, 62% 44%, 60% 100%, 40% 100%, 38% 44%, 22% 42%, 10% 16%);
    filter: drop-shadow(0 0 20px rgba(var(--accent-rgb), 0.5));
  }

  .microphone-scene.has-webgl .microphone-fallback {
    opacity: 0;
  }

  .staff-scene {
    position: absolute;
    top: 15%;
    width: 21%;
    height: 62%;
    z-index: 7;
    overflow: hidden;
    pointer-events: none;
    opacity: 0.9;
    mask-image: linear-gradient(90deg, transparent 0%, black 18%, black 82%, transparent 100%);
  }

  .staff-scene-left {
    left: 0;
    transform: rotate(-7deg);
  }

  .staff-scene-right {
    right: 0;
    transform: scaleX(-1) rotate(-7deg);
  }

  .staff-lines {
    position: absolute;
    left: -18%;
    top: 26%;
    width: 136%;
    height: 48%;
    animation: staff-drift 8s ease-in-out infinite alternate;
  }

  .staff-line {
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(var(--accent-hot-rgb), 0.62), rgba(var(--accent-rgb), 0.52), transparent);
    box-shadow: 0 0 12px rgba(var(--accent-rgb), 0.36);
  }

  .staff-note {
    position: absolute;
    color: rgba(var(--accent-hot-rgb), 0.82);
    font-weight: 800;
    line-height: 1;
    text-shadow: 0 0 18px rgba(var(--accent-rgb), 0.64);
    animation: note-pulse 3.8s ease-in-out infinite;
  }

  .staff-clef {
    left: 12%;
    top: 26%;
    font-size: clamp(38px, 5.4vw, 104px);
  }

  .staff-note-a {
    left: 45%;
    top: 34%;
    font-size: clamp(24px, 3.1vw, 58px);
    animation-delay: -1.2s;
  }

  .staff-note-b {
    left: 68%;
    top: 48%;
    font-size: clamp(20px, 2.5vw, 48px);
    animation-delay: -2.4s;
  }

  .settings-dock {
    position: absolute;
    top: clamp(12px, 1.3vw, 24px);
    right: clamp(12px, 1.5vw, 28px);
    z-index: 60;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 8px;
  }

  .settings-toggle {
    width: clamp(34px, 2.6vw, 50px);
    height: clamp(34px, 2.6vw, 50px);
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: rgba(var(--accent-hot-rgb), 0.9);
    background: rgba(0, 0, 0, 0.26);
    border: 1px solid rgba(var(--accent-rgb), 0.18);
    box-shadow: 0 0 14px rgba(0, 0, 0, 0.28), inset 0 0 10px rgba(var(--accent-rgb), 0.06);
    transition: background 160ms ease, border-color 160ms ease, transform 160ms ease, opacity 160ms ease;
    opacity: 0.46;
  }

  .settings-toggle:hover,
  .settings-toggle.is-open {
    opacity: 1;
    transform: translateY(-1px);
    background: rgba(0, 0, 0, 0.58);
    border-color: rgba(var(--accent-rgb), 0.48);
  }

  .settings-toggle svg {
    width: 54%;
    height: 54%;
  }

  .settings-panel {
    width: clamp(230px, 18vw, 320px);
    padding: 12px;
    border-radius: 10px;
    background: rgba(2, 2, 2, 0.78);
    border: 1px solid rgba(var(--accent-rgb), 0.28);
    box-shadow: 0 18px 42px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(var(--accent-rgb), 0.07);
    backdrop-filter: blur(14px);
    animation: settings-panel-in 160ms ease-out both;
  }

  .settings-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }

  .settings-label {
    color: rgba(255, 255, 255, 0.72);
    font-size: clamp(11px, 0.78vw, 14px);
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .settings-section + .settings-section {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.09);
  }

  .settings-version {
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(255, 255, 255, 0.09);
    color: rgba(255, 255, 255, 0.38);
    font-size: clamp(10px, 0.66vw, 12px);
    letter-spacing: 0.08em;
    text-align: right;
  }

  .settings-button-row {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    flex-wrap: wrap;
  }

  .theme-switcher {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
  }

  .theme-swatch-button {
    width: clamp(26px, 1.85vw, 38px);
    height: clamp(26px, 1.85vw, 38px);
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    display: grid;
    place-items: center;
    transition: transform 160ms ease, border-color 160ms ease, box-shadow 160ms ease, background 160ms ease;
  }

  .theme-swatch-button:hover,
  .theme-swatch-button.is-active {
    transform: translateY(-1px);
    border-color: rgba(var(--accent-hot-rgb), 0.82);
    box-shadow: 0 0 18px rgba(var(--accent-rgb), 0.42);
    background: rgba(255, 255, 255, 0.08);
  }

  .theme-swatch {
    width: 58%;
    height: 58%;
    border-radius: 999px;
    box-shadow: inset 0 0 8px rgba(255, 255, 255, 0.38), 0 0 10px rgba(0, 0, 0, 0.28);
  }

  .style-mode-button {
    min-width: clamp(44px, 3.4vw, 68px);
    height: clamp(30px, 2vw, 42px);
    border-radius: 999px;
    display: grid;
    place-items: center;
    padding: 0 11px;
    color: rgba(var(--accent-hot-rgb), 0.74);
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-size: clamp(12px, 0.78vw, 14px);
    font-weight: 700;
    letter-spacing: 0.08em;
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
  }

  .style-mode-button:hover,
  .style-mode-button.is-active {
    transform: translateY(-1px);
    color: rgb(var(--accent-hot-rgb));
    background: rgba(var(--accent-rgb), 0.14);
    border-color: rgba(var(--accent-rgb), 0.54);
  }

  .visual-mode-button {
    width: clamp(30px, 2vw, 42px);
    height: clamp(30px, 2vw, 42px);
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: rgba(var(--accent-hot-rgb), 0.78);
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(255, 255, 255, 0.14);
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
  }

  .visual-mode-button:hover,
  .visual-mode-button.is-active {
    transform: translateY(-1px);
    color: rgb(var(--accent-hot-rgb));
    background: rgba(var(--accent-rgb), 0.14);
    border-color: rgba(var(--accent-rgb), 0.54);
  }

  .visual-mode-button svg {
    width: 58%;
    height: 58%;
  }

  .quality-mode-button {
    min-width: clamp(38px, 2.8vw, 54px);
    height: clamp(30px, 2vw, 42px);
    border-radius: 999px;
    display: grid;
    place-items: center;
    padding: 0 10px;
    color: rgba(var(--accent-hot-rgb), 0.74);
    background: rgba(255, 255, 255, 0.045);
    border: 1px solid rgba(255, 255, 255, 0.14);
    font-size: clamp(12px, 0.82vw, 15px);
    font-weight: 700;
    letter-spacing: 0.08em;
    transition: transform 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
  }

  .quality-mode-button:hover,
  .quality-mode-button.is-active {
    transform: translateY(-1px);
    color: rgb(var(--accent-hot-rgb));
    background: rgba(var(--accent-rgb), 0.14);
    border-color: rgba(var(--accent-rgb), 0.54);
  }

  .control-icon-button {
    width: clamp(34px, 2.2vw, 46px);
    height: clamp(34px, 2.2vw, 46px);
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: rgb(var(--accent-hot-rgb));
    background: rgba(0, 0, 0, 0.52);
    border: 1px solid rgba(var(--accent-rgb), 0.58);
    transition: transform 160ms ease, background 160ms ease, border-color 160ms ease;
  }

  .control-icon-button:hover,
  .control-icon-button.is-active {
    transform: translateY(-1px);
    background: rgba(var(--accent-rgb), 0.16);
    border-color: rgba(var(--accent-hot-rgb), 0.86);
  }

  .control-icon-button svg {
    width: 54%;
    height: 54%;
    display: block;
  }

  .icon-slash {
    stroke: currentColor;
    stroke-width: 2.8;
    stroke-linecap: round;
    pointer-events: none;
  }

  .stage-light-beam {
    animation: beam-sweep var(--beam-speed) ease-in-out infinite;
    background: linear-gradient(
      180deg,
      transparent 0%,
      rgba(var(--accent-hot-rgb), 0.18) 12%,
      rgba(var(--accent-rgb), 0.34) 42%,
      rgba(var(--beam-shadow-rgb), 0.13) 72%,
      transparent 100%
    );
    clip-path: polygon(43% 0%, 57% 0%, 100% 100%, 0% 100%);
    filter: blur(1px);
    mix-blend-mode: screen;
  }

  .energy-ring {
    animation: ring-pulse var(--ring-speed) ease-in-out infinite;
    border: 1px solid rgba(var(--accent-rgb), 0.34);
    box-shadow:
      0 0 calc(18px + 30px * var(--sound-energy)) rgba(var(--accent-rgb), 0.26),
      inset 0 0 22px rgba(var(--accent-rgb), 0.08);
  }

  .gold-title {
    background: var(--title-gradient);
    background-size: 260% auto;
    background-position: 50% center;
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 14px 28px rgba(0, 0, 0, 0.95));
    transition: filter 90ms linear;
  }

  .gold-title.is-effect-on {
    filter:
      drop-shadow(0 14px 28px rgba(0, 0, 0, 0.95))
      drop-shadow(0 0 calc(12px + 28px * var(--title-energy)) rgba(var(--accent-hot-rgb), calc(0.16 + 0.58 * var(--title-energy))))
      drop-shadow(0 0 calc(22px + 54px * var(--title-energy)) rgba(var(--accent-rgb), calc(0.1 + 0.34 * var(--title-energy))));
    animation:
      gold-shine 7s ease-in-out infinite alternate,
      title-rise 980ms cubic-bezier(.2,.84,.25,1) both;
  }

  .gold-title.is-effect-off {
    animation: title-rise 980ms cubic-bezier(.2,.84,.25,1) both;
  }

  .lower-info-zone {
    position: relative;
    width: 100%;
    height: clamp(104px, 13vw, 250px);
    margin-top: 1%;
  }

  .date-pill-content {
    position: absolute;
    top: 0;
    left: 50%;
    height: clamp(34px, 3.8vw, 78px);
    transform: translateX(-50%);
  }

  .title-rise {
    animation: title-rise 760ms cubic-bezier(.2,.84,.25,1) both;
  }

  .scanner {
    animation: scan-pass 4.8s ease-in-out infinite;
    background: linear-gradient(90deg, transparent 0%, rgba(255, 245, 207, 0.72) 48%, transparent 100%);
  }

  .floating-score {
    animation: score-float linear infinite;
    color: rgba(var(--accent-hot-rgb), 0.38);
    text-shadow: 0 0 18px rgba(var(--accent-rgb), 0.42);
  }

  .stage-floor-line {
    animation: floor-glide 3.8s ease-in-out infinite;
    background: linear-gradient(to top, rgba(var(--accent-rgb), 0.76), rgba(var(--accent-rgb), 0));
    box-shadow: 0 0 14px rgba(var(--accent-rgb), 0.48);
  }

  .wave-wall {
    contain: layout paint style;
  }

  .wave-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  .microphone-button {
    box-shadow:
      0 0 calc(18px + 22px * var(--sound-energy)) rgba(var(--accent-rgb), 0.36),
      inset 0 0 14px rgba(var(--accent-hot-rgb), 0.12);
  }

  .organizer-row {
    --organizer-scale: 1;
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    width: 100%;
    min-height: clamp(48px, 7vh, 120px);
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .organizer-content {
    display: flex;
    flex-flow: row wrap;
    align-items: center;
    justify-content: center;
    gap: clamp(0.9vw, 5vw, calc(5vw / var(--organizer-scale)));
    color: rgb(229, 231, 235);
    font-size: 1.2vw;
    font-weight: 300;
    letter-spacing: 0.1em;
    transform: scale(var(--organizer-scale));
    transform-origin: center;
    transition: transform 180ms ease;
    will-change: transform;
  }

  .organizer-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: clamp(3px, 0.34vw, 8px);
    min-width: 0;
    max-width: 31vw;
  }

  .organizer-label {
    color: rgba(var(--accent-rgb), 0.9);
    font-size: 1vw;
    line-height: 1;
    white-space: nowrap;
  }

  .organizer-name {
    color: white;
    font-weight: 500;
    line-height: 1.16;
    text-wrap: balance;
    word-break: keep-all;
    overflow-wrap: anywhere;
  }

  .organizer-divider {
    width: 2px;
    height: 4vh;
    background: rgba(var(--accent-rgb), 0.3);
    flex: 0 0 auto;
  }

  @media (max-width: 768px) {
    .settings-dock {
      position: fixed;
      top: max(10px, env(safe-area-inset-top));
      right: max(10px, env(safe-area-inset-right));
      z-index: 100;
    }

    .settings-panel {
      width: min(320px, calc(100vw - 22px));
      max-height: calc(100dvh - 70px);
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 10px;
      border-radius: 8px;
      scrollbar-width: thin;
    }

    .settings-row {
      gap: 8px;
    }

    .settings-section + .settings-section,
    .settings-version {
      margin-top: 8px;
      padding-top: 8px;
    }

    .settings-label {
      font-size: 11px;
    }

    .settings-button-row,
    .theme-switcher {
      gap: 5px;
    }

    .style-mode-button {
      min-width: 44px;
      height: 30px;
      padding: 0 9px;
      font-size: 12px;
    }

    .visual-mode-button,
    .quality-mode-button,
    .control-icon-button {
      width: 32px;
      min-width: 32px;
      height: 32px;
      padding: 0;
    }

    .theme-swatch-button {
      width: 30px;
      height: 30px;
    }
  }
`;

function createFloatingScores() {
  return Array.from({ length: MAX_FLOATING_SCORE_COUNT }).map((_, index) => ({
    id: index,
    symbol: NOTE_SYMBOLS[Math.floor(Math.random() * NOTE_SYMBOLS.length)],
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 18}s`,
    duration: `${12 + Math.random() * 16}s`,
    drift: `${Math.random() * 12 - 6}vw`,
    size: `${Math.random() * 1.5 + 1.15}vw`,
  }));
}

function createWaveBars() {
  return Array.from({ length: MAX_WAVE_BAR_COUNT }).map((_, index) => ({
    id: index,
    delayValue: Math.random() * 1.35,
    durationValue: 0.55 + Math.random() * 0.95,
  }));
}

function createLightBeams() {
  return Array.from({ length: 9 }).map((_, index) => ({
    id: index,
    left: `${7 + index * 10.75}%`,
    width: `${7 + (index % 3) * 2.2}%`,
    rotate: `${-24 + index * 6}deg`,
    delay: `${index * -0.48}s`,
    speed: `${7.2 + (index % 4) * 1.1}s`,
  }));
}

function createEnergyRings() {
  return [
    {
      id: 0,
      width: "25vw",
      height: "9vw",
      opacity: 0.18,
      speed: "7.2s",
      delay: "-0.6s",
    },
    {
      id: 1,
      width: "42vw",
      height: "15vw",
      opacity: 0.15,
      speed: "8.4s",
      delay: "-1.2s",
    },
    {
      id: 2,
      width: "60vw",
      height: "21vw",
      opacity: 0.11,
      speed: "10.2s",
      delay: "-2.1s",
    },
    {
      id: 3,
      width: "80vw",
      height: "28vw",
      opacity: 0.08,
      speed: "12.5s",
      delay: "-3s",
    },
  ];
}

function createFloorLines() {
  return Array.from({ length: 11 }).map((_, index) => ({
    id: index,
    rotate: `${-48 + index * 9.6}deg`,
    delay: `${index * -0.18}s`,
  }));
}

function createParticles() {
  return Array.from({ length: 80 }).map((_, index) => ({
    id: index,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 15}s`,
    duration: `${15 + Math.random() * 20}s`,
    size: `${Math.random() * 3 + 1}px`,
    opacity: Math.random() * 0.5 + 0.3,
  }));
}

function MicIcon({ muted = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.75a3 3 0 0 0-3 3v5.5a3 3 0 0 0 6 0v-5.5a3 3 0 0 0-3-3Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M5.75 11.25a6.25 6.25 0 0 0 12.5 0M12 17.5v3.25M8.25 20.75h7.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      {muted && <path className="icon-slash" d="M4.5 4.5 19.5 19.5" />}
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 8.25a3.75 3.75 0 1 0 0 7.5 3.75 3.75 0 0 0 0-7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M19.1 13.55c.06-.5.06-1.02 0-1.55l1.38-1.08-1.55-2.68-1.7.68a7.62 7.62 0 0 0-1.34-.78L15.63 6.3h-3.1l-.26 1.84c-.48.2-.92.46-1.34.78l-1.7-.68-1.55 2.68L9.06 12a7.25 7.25 0 0 0 0 1.55l-1.38 1.08 1.55 2.68 1.7-.68c.42.32.86.58 1.34.78l.26 1.84h3.1l.26-1.84c.48-.2.92-.46 1.34-.78l1.7.68 1.55-2.68-1.38-1.08Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ hidden = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3.6 12s3.1-5.25 8.4-5.25S20.4 12 20.4 12s-3.1 5.25-8.4 5.25S3.6 12 3.6 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M12 9.25a2.75 2.75 0 1 1 0 5.5 2.75 2.75 0 0 1 0-5.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      {hidden && <path className="icon-slash" d="M4.5 4.5 19.5 19.5" />}
    </svg>
  );
}

function SparkleIcon({ disabled = false }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3.8 13.55 8.9 18.6 10.45 13.55 12 12 17.1 10.45 12 5.4 10.45 10.45 8.9 12 3.8Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinejoin="round"
      />
      <path
        d="M18.25 14.25 19 16.75l2.45.75-2.45.75-.75 2.5-.75-2.5-2.45-.75 2.45-.75.75-2.5ZM5.25 15.5l.48 1.58 1.52.47-1.52.47-.48 1.58-.48-1.58-1.52-.47 1.52-.47.48-1.58Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      {disabled && <path className="icon-slash" d="M4.5 4.5 19.5 19.5" />}
    </svg>
  );
}

function VisualIcon({ type }) {
  if (type === "staff") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7h16M4 9.5h16M4 12h16M4 14.5h16M4 17h16"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M16.5 5.25v9.4a2.25 2.25 0 1 1-1.3-2.04V6.4l4-1.15v2.1l-4 1.15"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (type === "mic") {
    return <MicIcon />;
  }

  if (type === "none") {
    return (
      <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 5h14v14H5V5Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M6.2 17.8 17.8 6.2"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M8 4h8l-1.1 7.2a3 3 0 0 1-5.8 0L8 4Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 6H5.75c0 2.9 1.52 4.6 3.72 4.9M15.5 6h2.75c0 2.9-1.52 4.6-3.72 4.9M12 14v3M8.5 20h7M9.5 17h5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function createStarGeometry(radius = 1, innerRadius = 0.46) {
  const shape = new THREE.Shape();
  for (let index = 0; index < 10; index += 1) {
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    const pointRadius = index % 2 === 0 ? radius : innerRadius;
    const x = Math.cos(angle) * pointRadius;
    const y = Math.sin(angle) * pointRadius;
    if (index === 0) {
      shape.moveTo(x, y);
    } else {
      shape.lineTo(x, y);
    }
  }
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.06,
    bevelEnabled: true,
    bevelSize: 0.018,
    bevelThickness: 0.018,
    bevelSegments: 2,
  });
}

function createTrophyMesh(theme, energyRef, side) {
  const group = new THREE.Group();
  const cupMaterial = new THREE.MeshStandardMaterial({
    color: theme.three.primary,
    metalness: 0.9,
    roughness: 0.22,
    emissive: theme.three.emissive,
    emissiveIntensity: 0.08,
  });
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: theme.three.secondary,
    metalness: 0.82,
    roughness: 0.28,
    emissive: theme.three.emissive,
    emissiveIntensity: 0.04,
  });
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: theme.three.highlight,
    metalness: 0.74,
    roughness: 0.18,
    emissive: theme.three.highlight,
    emissiveIntensity: 0.05,
  });
  const shadowMaterial = new THREE.MeshStandardMaterial({
    color: "#2b1606",
    metalness: 0.56,
    roughness: 0.36,
    emissive: theme.three.emissive,
    emissiveIntensity: 0.025,
  });
  const ribbonMaterial = new THREE.MeshStandardMaterial({
    color: theme.three.emissive,
    metalness: 0.52,
    roughness: 0.3,
    emissive: theme.three.emissive,
    emissiveIntensity: 0.12,
  });

  const addMesh = (geometry, material, transform = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    if (transform.position) {
      mesh.position.set(...transform.position);
    }
    if (transform.rotation) {
      mesh.rotation.set(...transform.rotation);
    }
    if (transform.scale) {
      mesh.scale.set(...transform.scale);
    }
    group.add(mesh);
    return mesh;
  };

  const bowlPoints = [
    new THREE.Vector2(0.22, -0.78),
    new THREE.Vector2(0.36, -0.68),
    new THREE.Vector2(0.58, -0.28),
    new THREE.Vector2(0.78, 0.38),
    new THREE.Vector2(0.98, 0.92),
    new THREE.Vector2(1.08, 1.1),
    new THREE.Vector2(0.86, 1.24),
    new THREE.Vector2(0.58, 1.08),
    new THREE.Vector2(0.45, 0.52),
    new THREE.Vector2(0.32, -0.42),
    new THREE.Vector2(0.22, -0.78),
  ];
  addMesh(new THREE.LatheGeometry(bowlPoints, 96), cupMaterial, {
    position: [0, 0.34, 0],
    scale: [1, 1.05, 1],
  });
  addMesh(
    new THREE.LatheGeometry(
      [new THREE.Vector2(0.2, 0), new THREE.Vector2(0.7, 0.02)],
      96,
    ),
    shadowMaterial,
    {
      position: [0, 1.58, 0],
      scale: [1, 1, 0.82],
    },
  );
  addMesh(new THREE.TorusGeometry(0.93, 0.07, 18, 128), highlightMaterial, {
    position: [0, 1.62, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: [1.05, 1, 0.82],
  });
  addMesh(new THREE.TorusGeometry(0.61, 0.024, 12, 96), highlightMaterial, {
    position: [0, 0.73, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: [1.08, 1, 0.72],
  });
  addMesh(new THREE.TorusGeometry(0.43, 0.02, 12, 96), highlightMaterial, {
    position: [0, -0.22, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: [1.08, 1, 0.72],
  });
  addMesh(new THREE.CylinderGeometry(0.18, 0.24, 0.82, 48), cupMaterial, {
    position: [0, -0.72, 0],
  });
  addMesh(new THREE.CylinderGeometry(0.62, 0.72, 0.18, 64), baseMaterial, {
    position: [0, -1.24, 0],
  });
  addMesh(new THREE.CylinderGeometry(0.82, 0.96, 0.2, 64), baseMaterial, {
    position: [0, -1.45, 0],
  });
  addMesh(new THREE.CylinderGeometry(0.55, 0.44, 0.15, 64), highlightMaterial, {
    position: [0, -1.04, 0],
  });
  addMesh(new THREE.CylinderGeometry(0.92, 1.08, 0.16, 64), shadowMaterial, {
    position: [0, -1.64, 0],
  });
  addMesh(new THREE.BoxGeometry(0.88, 0.28, 0.055), highlightMaterial, {
    position: [0, -1.35, 0.78],
    rotation: [-0.04, 0, 0],
  });
  addMesh(new THREE.BoxGeometry(0.62, 0.08, 0.06), shadowMaterial, {
    position: [0, -1.33, 0.815],
    rotation: [-0.04, 0, 0],
  });
  addMesh(createStarGeometry(), highlightMaterial, {
    position: [0, 0.5, 0.8],
    rotation: [0, 0, 0],
    scale: [0.23, 0.23, 0.23],
  });
  addMesh(new THREE.BoxGeometry(0.09, 1.05, 0.035), ribbonMaterial, {
    position: [-0.22, 0.38, 0.79],
    rotation: [0, 0, -0.22],
  });
  addMesh(new THREE.BoxGeometry(0.09, 1.05, 0.035), ribbonMaterial, {
    position: [0.22, 0.38, 0.79],
    rotation: [0, 0, 0.22],
  });

  const makeHandle = (direction) => {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.77 * direction, 1.2, -0.02),
      new THREE.Vector3(1.38 * direction, 0.96, 0.03),
      new THREE.Vector3(1.4 * direction, 0.18, 0.02),
      new THREE.Vector3(0.68 * direction, -0.14, -0.02),
    ]);
    const innerCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.72 * direction, 0.96, 0.02),
      new THREE.Vector3(1.12 * direction, 0.78, 0.06),
      new THREE.Vector3(1.1 * direction, 0.28, 0.05),
      new THREE.Vector3(0.61 * direction, 0.04, 0.02),
    ]);
    addMesh(new THREE.TubeGeometry(curve, 64, 0.065, 18, false), cupMaterial);
    addMesh(
      new THREE.TubeGeometry(innerCurve, 48, 0.025, 12, false),
      highlightMaterial,
    );
  };
  makeHandle(-1);
  makeHandle(1);

  const keyLight = new THREE.PointLight(theme.three.highlight, 2.4, 8);
  keyLight.position.set(side === "left" ? -2 : 2, 2.2, 3.2);
  group.add(keyLight);

  group.userData.animate = (time) => {
    const energy = Number(energyRef.current) || 0;
    const sideDirection = side === "left" ? 1 : -1;
    group.rotation.y = sideDirection * 0.36 + Math.sin(time * 0.7) * 0.08;
    group.rotation.x = Math.sin(time * 0.56) * 0.025;
    group.rotation.z = sideDirection * -0.03 + Math.sin(time * 0.42) * 0.018;
    group.scale.setScalar(1.08 + energy * 0.055);
    cupMaterial.emissiveIntensity = 0.08 + energy * 0.2;
    baseMaterial.emissiveIntensity = 0.04 + energy * 0.12;
    highlightMaterial.emissiveIntensity = 0.05 + energy * 0.16;
    keyLight.intensity = 2.4 + energy * 3.5;
  };

  return group;
}

function createMicrophoneMesh(theme, energyRef, side) {
  const group = new THREE.Group();
  const goldMaterial = new THREE.MeshStandardMaterial({
    color: theme.three.primary,
    metalness: 0.94,
    roughness: 0.18,
    emissive: theme.three.emissive,
    emissiveIntensity: 0.07,
  });
  const deepGoldMaterial = new THREE.MeshStandardMaterial({
    color: theme.three.secondary,
    metalness: 0.86,
    roughness: 0.26,
    emissive: theme.three.emissive,
    emissiveIntensity: 0.04,
  });
  const highlightMaterial = new THREE.MeshStandardMaterial({
    color: theme.three.highlight,
    metalness: 0.78,
    roughness: 0.14,
    emissive: theme.three.highlight,
    emissiveIntensity: 0.06,
  });
  const darkGrooveMaterial = new THREE.MeshStandardMaterial({
    color: "#201208",
    metalness: 0.58,
    roughness: 0.42,
  });

  const addMesh = (geometry, material, transform = {}) => {
    const mesh = new THREE.Mesh(geometry, material);
    if (transform.position) {
      mesh.position.set(...transform.position);
    }
    if (transform.rotation) {
      mesh.rotation.set(...transform.rotation);
    }
    if (transform.scale) {
      mesh.scale.set(...transform.scale);
    }
    group.add(mesh);
    return mesh;
  };

  const headProfile = [
    new THREE.Vector2(0.34, -0.76),
    new THREE.Vector2(0.5, -0.62),
    new THREE.Vector2(0.62, -0.28),
    new THREE.Vector2(0.66, 0.34),
    new THREE.Vector2(0.58, 0.78),
    new THREE.Vector2(0.4, 1.02),
    new THREE.Vector2(0.14, 1.12),
  ];
  addMesh(new THREE.LatheGeometry(headProfile, 96), goldMaterial, {
    position: [0, 0.95, 0],
    rotation: [0, 0, 0],
    scale: [0.92, 1.02, 0.92],
  });

  [-0.45, -0.22, 0, 0.22, 0.45, 0.68].forEach((offset, index) => {
    addMesh(
      new THREE.TorusGeometry(0.58 - index * 0.022, 0.012, 10, 96),
      darkGrooveMaterial,
      {
        position: [0, 0.95 + offset, 0],
        rotation: [Math.PI / 2, 0, 0],
        scale: [0.94, 1, 0.72],
      },
    );
  });

  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    const x = Math.cos(angle) * 0.43;
    const z = Math.sin(angle) * 0.27;
    addMesh(
      new THREE.CylinderGeometry(0.008, 0.008, 1.3, 8),
      highlightMaterial,
      {
        position: [x, 0.93, z],
        rotation: [0, 0, Math.sin(angle) * 0.18],
        scale: [1, 1, 1],
      },
    );
  }

  addMesh(new THREE.TorusGeometry(0.52, 0.05, 16, 96), highlightMaterial, {
    position: [0, 0.12, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: [0.98, 1, 0.78],
  });
  addMesh(new THREE.CylinderGeometry(0.32, 0.24, 1.66, 64), deepGoldMaterial, {
    position: [0, -0.76, 0],
  });
  addMesh(new THREE.CylinderGeometry(0.25, 0.34, 0.38, 64), goldMaterial, {
    position: [0, -1.75, 0],
  });
  addMesh(new THREE.TorusGeometry(0.31, 0.028, 12, 96), highlightMaterial, {
    position: [0, -0.42, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: [1, 1, 0.82],
  });
  addMesh(new THREE.TorusGeometry(0.27, 0.026, 12, 96), highlightMaterial, {
    position: [0, -1.25, 0],
    rotation: [Math.PI / 2, 0, 0],
    scale: [1, 1, 0.82],
  });
  addMesh(new THREE.BoxGeometry(0.38, 0.16, 0.05), highlightMaterial, {
    position: [0, -0.92, 0.26],
    rotation: [-0.08, 0, 0],
  });
  addMesh(createStarGeometry(0.48, 0.22), highlightMaterial, {
    position: [0, -0.92, 0.3],
    scale: [0.12, 0.12, 0.12],
  });

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.05, -1.9, -0.03),
    new THREE.Vector3(0.44, -2.22, 0.02),
    new THREE.Vector3(0.1, -2.48, 0.03),
    new THREE.Vector3(-0.3, -2.3, -0.02),
  ]);
  addMesh(
    new THREE.TubeGeometry(cableCurve, 42, 0.018, 10, false),
    darkGrooveMaterial,
  );

  const keyLight = new THREE.PointLight(theme.three.highlight, 2.6, 8);
  keyLight.position.set(side === "left" ? -1.7 : 1.7, 2.4, 3.1);
  group.add(keyLight);

  group.userData.animate = (time) => {
    const energy = Number(energyRef.current) || 0;
    const sideDirection = side === "left" ? 1 : -1;
    group.rotation.y = sideDirection * 0.52 + Math.sin(time * 0.58) * 0.07;
    group.rotation.x = 0.08 + Math.sin(time * 0.52) * 0.025;
    group.rotation.z = sideDirection * -0.18 + Math.sin(time * 0.64) * 0.026;
    group.scale.setScalar(1.08 + energy * 0.06);
    goldMaterial.emissiveIntensity = 0.07 + energy * 0.22;
    deepGoldMaterial.emissiveIntensity = 0.04 + energy * 0.14;
    highlightMaterial.emissiveIntensity = 0.06 + energy * 0.2;
    keyLight.intensity = 2.6 + energy * 3.8;
  };

  return group;
}

function TrophyScene({ side, theme, energyRef, quality }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    let frameId = 0;
    let renderer;
    let resizeObserver;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.02, 6.4);

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("WebGL trophy renderer unavailable", error);
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, quality.maxThreePixelRatio),
    );
    mount.appendChild(renderer.domElement);
    mount.classList.add("has-webgl");

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const frontLight = new THREE.DirectionalLight(theme.three.highlight, 2.1);
    frontLight.position.set(0, 2.5, 4);
    scene.add(frontLight);
    const rimLight = new THREE.DirectionalLight(theme.three.emissive, 1.4);
    rimLight.position.set(side === "left" ? -2.8 : 2.8, 0.8, 2.4);
    scene.add(rimLight);

    const trophy = createTrophyMesh(theme, energyRef, side);
    scene.add(trophy);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const clock = new THREE.Clock();
    const minFrameDuration = 1000 / quality.threeRenderFps;
    let lastRenderTime = 0;
    const render = (frameTime = 0) => {
      frameId = requestAnimationFrame(render);
      if (frameTime - lastRenderTime < minFrameDuration) {
        return;
      }
      lastRenderTime = frameTime;
      const time = clock.getElapsedTime();
      trophy.userData.animate(time);
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      mount.classList.remove("has-webgl");
    };
  }, [energyRef, quality, side, theme]);

  return (
    <div
      ref={mountRef}
      data-testid={`trophy-scene-${side}`}
      className={`trophy-scene trophy-scene-${side}`}
      aria-hidden="true"
    >
      <div className="trophy-halo" />
      <div className="trophy-fallback" />
    </div>
  );
}

function MicrophoneScene({ side, theme, energyRef, quality }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) {
      return undefined;
    }

    let frameId = 0;
    let renderer;
    let resizeObserver;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.02, 6.5);

    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch (error) {
      console.warn("WebGL microphone renderer unavailable", error);
      return undefined;
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, quality.maxThreePixelRatio),
    );
    mount.appendChild(renderer.domElement);
    mount.classList.add("has-webgl");

    scene.add(new THREE.AmbientLight(0xffffff, 0.86));
    const frontLight = new THREE.DirectionalLight(theme.three.highlight, 2.2);
    frontLight.position.set(0, 2.8, 4.2);
    scene.add(frontLight);
    const rimLight = new THREE.DirectionalLight(theme.three.emissive, 1.5);
    rimLight.position.set(side === "left" ? -2.8 : 2.8, 0.9, 2.6);
    scene.add(rimLight);

    const microphone = createMicrophoneMesh(theme, energyRef, side);
    scene.add(microphone);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const clock = new THREE.Clock();
    const minFrameDuration = 1000 / quality.threeRenderFps;
    let lastRenderTime = 0;
    const render = (frameTime = 0) => {
      frameId = requestAnimationFrame(render);
      if (frameTime - lastRenderTime < minFrameDuration) {
        return;
      }
      lastRenderTime = frameTime;
      const time = clock.getElapsedTime();
      microphone.userData.animate(time);
      renderer.render(scene, camera);
    };
    render();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      scene.traverse((object) => {
        if (object.geometry) {
          object.geometry.dispose();
        }
        if (object.material) {
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
      mount.classList.remove("has-webgl");
    };
  }, [energyRef, quality, side, theme]);

  return (
    <div
      ref={mountRef}
      data-testid={`microphone-scene-${side}`}
      className={`microphone-scene microphone-scene-${side}`}
      aria-hidden="true"
    >
      <div className="microphone-halo" />
      <div className="microphone-fallback" />
    </div>
  );
}

function StaffScene({ side }) {
  return (
    <div
      data-testid={`staff-scene-${side}`}
      className={`staff-scene staff-scene-${side}`}
      aria-hidden="true"
    >
      <div className="staff-lines">
        {[0, 1, 2, 3, 4].map((line) => (
          <span
            key={line}
            className="staff-line"
            style={{ top: `${line * 18}%` }}
          />
        ))}
      </div>
      <span className="staff-note staff-clef">𝄞</span>
      <span className="staff-note staff-note-a">♪</span>
      <span className="staff-note staff-note-b">♫</span>
    </div>
  );
}

function CinematicStyleLayer({ mounted, particles }) {
  return (
    <>
      <div
        data-testid="cinematic-style-layer"
        className="absolute inset-0 z-[1] pointer-events-none"
        aria-hidden="true"
      >
        <div className="cinematic-ring cinematic-ring-a" />
        <div className="cinematic-ring cinematic-ring-b" />
        <div className="cinematic-spotlight cinematic-spotlight-top" />
        <div className="cinematic-spotlight cinematic-spotlight-left" />
        <div className="cinematic-spotlight cinematic-spotlight-right" />
      </div>
      {mounted &&
        particles.map((particle) => (
          <div
            key={particle.id}
            data-testid="cinematic-particle"
            className="cinematic-particle"
            style={{
              left: particle.left,
              width: particle.size,
              height: particle.size,
              "--particle-opacity": particle.opacity,
              animationDelay: particle.delay,
              animationDuration: particle.duration,
            }}
          />
        ))}
    </>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeStyleId, setActiveStyleId] = useState(DEFAULT_STYLE_MODE);
  const [activeThemeId, setActiveThemeId] = useState(THEME_OPTIONS[0].id);
  const [activeVisualMode, setActiveVisualMode] = useState(DEFAULT_VISUAL_MODE);
  const [activeQualityId, setActiveQualityId] = useState(DEFAULT_QUALITY_MODE);
  const [activeOrganizerSizeId, setActiveOrganizerSizeId] = useState(
    DEFAULT_ORGANIZER_SIZE,
  );
  const [isDateVisible, setIsDateVisible] = useState(true);
  const [isTitleEffectEnabled, setIsTitleEffectEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const stageRef = useRef(null);
  const waveCanvasRef = useRef(null);
  const waveTargetsRef = useRef(new Float32Array(MAX_WAVE_BAR_COUNT));
  const waveLevelsRef = useRef(new Float32Array(MAX_WAVE_BAR_COUNT));
  const waveFrameRef = useRef(null);
  const soundEnergyRef = useRef(0);
  const qualityRef = useRef(QUALITY_OPTIONS[0]);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const sourceRef = useRef(null);

  const activeTheme = useMemo(
    () =>
      THEME_OPTIONS.find((theme) => theme.id === activeThemeId) ||
      THEME_OPTIONS[0],
    [activeThemeId],
  );
  const activeStyle = useMemo(
    () =>
      STYLE_OPTIONS.find((style) => style.id === activeStyleId) ||
      STYLE_OPTIONS[0],
    [activeStyleId],
  );
  const isCinematicStyle = activeStyle.id === "cinematic";
  const activeQuality = useMemo(
    () =>
      QUALITY_OPTIONS.find((quality) => quality.id === activeQualityId) ||
      QUALITY_OPTIONS[0],
    [activeQualityId],
  );
  const activeOrganizerSize = useMemo(
    () =>
      ORGANIZER_SIZE_OPTIONS.find(
        (size) => size.id === activeOrganizerSizeId,
      ) || ORGANIZER_SIZE_OPTIONS[0],
    [activeOrganizerSizeId],
  );
  const floatingScores = useMemo(() => createFloatingScores(), []);
  const waves = useMemo(() => createWaveBars(), []);
  const visibleFloatingScores = useMemo(
    () => floatingScores.slice(0, activeQuality.floatingScoreCount),
    [activeQuality.floatingScoreCount, floatingScores],
  );
  const lightBeams = useMemo(() => createLightBeams(), []);
  const energyRings = useMemo(() => createEnergyRings(), []);
  const floorLines = useMemo(() => createFloorLines(), []);
  const particles = useMemo(() => createParticles(), []);

  const setSoundEnergy = useCallback((energy) => {
    soundEnergyRef.current = Number(energy) || 0;
    if (stageRef.current) {
      stageRef.current.style.setProperty("--sound-energy", String(energy));
    }
  }, []);

  const setBassEnergy = useCallback((energy) => {
    if (stageRef.current) {
      stageRef.current.style.setProperty("--bass-energy", String(energy));
    }
  }, []);

  const setTitleEnergy = useCallback((energy) => {
    if (stageRef.current) {
      stageRef.current.style.setProperty("--title-energy", String(energy));
    }
  }, []);

  const stopMicrophone = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }

    waveTargetsRef.current.fill(0);
    waveLevelsRef.current.fill(0);

    setSoundEnergy(0);
    setBassEnergy(0);
    setTitleEnergy(0);
    setIsListening(false);
  }, [setBassEnergy, setSoundEnergy, setTitleEnergy]);

  useEffect(() => {
    setMounted(true);
    return () => stopMicrophone();
  }, [stopMicrophone]);

  useEffect(() => {
    qualityRef.current = activeQuality;
    waveTargetsRef.current.fill(0);
    waveLevelsRef.current.fill(0);
  }, [activeQuality]);

  useEffect(() => {
    const canvas = waveCanvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) {
      return undefined;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return undefined;
    }

    let logicalWidth = 0;
    let logicalHeight = 0;
    let pixelRatio = 1;
    let accent = "250, 204, 21";
    let accentHot = "255, 247, 198";
    let coolGradient = null;
    let hotGradient = null;

    const readRgbVar = (styles, name, fallback) =>
      styles.getPropertyValue(name).trim() || fallback;

    const refreshPaint = () => {
      const styles = getComputedStyle(stage);
      accent = readRgbVar(styles, "--accent-rgb", "250, 204, 21");
      accentHot = readRgbVar(styles, "--accent-hot-rgb", "255, 247, 198");
      const accentDeep = readRgbVar(styles, "--accent-deep-rgb", "180, 83, 34");
      coolGradient = context.createLinearGradient(0, logicalHeight, 0, 0);
      coolGradient.addColorStop(0, `rgba(${accentDeep}, 0.54)`);
      coolGradient.addColorStop(1, `rgba(${accent}, 0.78)`);
      hotGradient = context.createLinearGradient(0, logicalHeight, 0, 0);
      hotGradient.addColorStop(0, `rgba(${accent}, 0.92)`);
      hotGradient.addColorStop(1, `rgba(${accentHot}, 1)`);
    };

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      logicalWidth = Math.max(1, rect.width);
      logicalHeight = Math.max(1, rect.height);
      pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.round(logicalWidth * pixelRatio);
      const nextHeight = Math.round(logicalHeight * pixelRatio);
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      refreshPaint();
    };

    const drawRoundedTopBar = (x, y, width, height, radius) => {
      const safeRadius = Math.min(radius, width / 2, height / 2);
      context.beginPath();
      context.moveTo(x, logicalHeight);
      context.lineTo(x, y + safeRadius);
      context.quadraticCurveTo(x, y, x + safeRadius, y);
      context.lineTo(x + width - safeRadius, y);
      context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
      context.lineTo(x + width, logicalHeight);
      context.closePath();
      context.fill();
    };

    const renderWaveFrame = (frameTime = 0) => {
      if (!coolGradient || !hotGradient) {
        resizeCanvas();
      }
      const count = qualityRef.current.waveBarCount;
      const preferredGap = Math.min(5, Math.max(0.6, logicalWidth * 0.0018));
      const gap = Math.min(preferredGap, (logicalWidth / count) * 0.55);
      const barWidth = Math.max(
        0.35,
        (logicalWidth - gap * (count - 1)) / count,
      );
      const radius = Math.min(5, Math.max(2, logicalWidth * 0.0022));
      const levels = waveLevelsRef.current;
      const targets = waveTargetsRef.current;
      const time = frameTime / 1000;

      context.clearRect(0, 0, logicalWidth, logicalHeight);

      context.save();
      context.globalCompositeOperation = "lighter";
      context.shadowBlur = 14;
      context.shadowColor = `rgba(${accent}, 0.42)`;
      context.fillStyle = `rgba(${accent}, 0.13)`;
      for (let index = 0; index < count; index += 1) {
        const pattern = waves[index];
        const phase =
          ((time + pattern.delayValue) / pattern.durationValue) * Math.PI * 2;
        const idleTarget =
          0.16 + Math.pow((Math.sin(phase) + 1) / 2, 1.35) * 0.84;
        const target = isListening ? targets[index] : idleTarget;
        const difference = target - levels[index];
        const smoothing = isListening
          ? difference > 0
            ? WAVE_ATTACK_SMOOTHING
            : WAVE_RELEASE_SMOOTHING
          : 0.12;
        levels[index] += (target - levels[index]) * smoothing;
        const rawNormalized = isListening
          ? Math.min(1, Math.max(0.06, levels[index] / 2.05))
          : Math.min(1, Math.max(0.06, levels[index]));
        const normalized = isListening
          ? Math.pow(rawNormalized, 0.84)
          : rawNormalized;
        if (normalized < 0.66) {
          continue;
        }
        const height = logicalHeight * normalized;
        const x = index * (barWidth + gap);
        const y = logicalHeight - height;
        drawRoundedTopBar(x, y, barWidth, height, radius);
      }
      context.restore();

      for (let index = 0; index < count; index += 1) {
        const rawNormalized = isListening
          ? Math.min(1, Math.max(0.06, levels[index] / 2.05))
          : Math.min(1, Math.max(0.06, levels[index]));
        const normalized = isListening
          ? Math.pow(rawNormalized, 0.84)
          : rawNormalized;
        const height = Math.max(2, logicalHeight * normalized);
        const x = index * (barWidth + gap);
        const y = logicalHeight - height;
        context.fillStyle = normalized > 0.68 ? hotGradient : coolGradient;
        drawRoundedTopBar(x, y, barWidth, height, radius);
      }

      waveFrameRef.current = requestAnimationFrame(renderWaveFrame);
    };

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);
    renderWaveFrame();

    return () => {
      resizeObserver.disconnect();
      if (waveFrameRef.current) {
        cancelAnimationFrame(waveFrameRef.current);
        waveFrameRef.current = null;
      }
    };
  }, [activeQuality, activeTheme, isCinematicStyle, isListening, waves]);

  const startMicrophone = async () => {
    if (isListening) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setErrorMessage("此瀏覽器不支援麥克風互動，請改用新版 Chrome 或 Edge。");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = AUDIO_ANALYSER_SMOOTHING;
      source.connect(analyser);

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;
      mediaStreamRef.current = stream;
      sourceRef.current = source;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      let lastAudioFrameTime = Number.NEGATIVE_INFINITY;

      setIsListening(true);
      setErrorMessage("");

      const renderFrame = (frameTime = 0) => {
        animationRef.current = requestAnimationFrame(renderFrame);
        const currentQuality = qualityRef.current;
        const minAudioFrameDuration = 1000 / currentQuality.audioReactionFps;
        if (frameTime - lastAudioFrameTime < minAudioFrameDuration) {
          return;
        }
        lastAudioFrameTime = frameTime;
        analyser.getByteFrequencyData(dataArray);

        let total = 0;
        let bassTotal = 0;
        let titleTotal = 0;
        let titleCount = 0;
        const activeWaveBarCount = currentQuality.waveBarCount;
        const activeWavePairCount = activeWaveBarCount / 2;
        const waveTargets = waveTargetsRef.current;
        for (let i = 0; i < activeWavePairCount; i += 1) {
          const value = dataArray[i] || 0;
          total += value;
          if (i < 9) {
            bassTotal += value;
          }
          const response = Math.pow(value / 255, 0.78);
          const scale = 0.12 + response * 1.95;

          waveTargets[i] = scale;
          waveTargets[activeWaveBarCount - 1 - i] = scale;
        }

        const titleStartBin = 12;
        const titleEndBin = Math.min(bufferLength, 72);
        for (let i = titleStartBin; i < titleEndBin; i += 1) {
          titleTotal += dataArray[i] || 0;
          titleCount += 1;
        }

        const energy = Math.min(1, total / (activeWavePairCount * 210));
        const bassEnergy = Math.min(1, bassTotal / (9 * 190));
        const titleEnergy =
          titleCount > 0
            ? Math.min(1, Math.pow(titleTotal / (titleCount * 185), 0.82))
            : 0;
        setSoundEnergy(energy.toFixed(3));
        setBassEnergy(bassEnergy.toFixed(3));
        setTitleEnergy(titleEnergy.toFixed(3));
      };

      renderFrame(performance.now());
    } catch (error) {
      console.error("無法存取麥克風: ", error);
      stopMicrophone();
      setErrorMessage("無法存取麥克風，請確認瀏覽器已允許權限。");
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center">
      <div
        className="relative w-full max-w-[calc(100vh*21/9)] aspect-[21/9]"
        style={activeTheme.vars}
      >
        <style>{customStyles}</style>

        <div
          ref={stageRef}
          data-testid="cinematic-stage"
          className={`stage-shell absolute inset-0 overflow-hidden flex items-center justify-center font-sans select-none ${isListening ? "is-listening" : ""} ${isCinematicStyle ? "is-cinematic-style" : ""}`}
          style={activeTheme.vars}
        >
          {isCinematicStyle ? (
            <CinematicStyleLayer mounted={mounted} particles={particles} />
          ) : (
            <>
              <div className="absolute inset-x-0 top-0 h-[16%] bg-gradient-to-b from-yellow-100/14 via-yellow-500/10 to-transparent z-[1]" />
              <div className="absolute inset-x-[6%] top-[7%] h-[1px] bg-gradient-to-r from-transparent via-yellow-200/70 to-transparent z-[2]" />
              <div className="absolute left-[8%] top-[8%] h-[76%] w-[1px] bg-gradient-to-b from-transparent via-yellow-300/35 to-transparent z-[2]" />
              <div className="absolute right-[8%] top-[8%] h-[76%] w-[1px] bg-gradient-to-b from-transparent via-yellow-300/35 to-transparent z-[2]" />

              <div
                data-testid="ambient-breathe"
                className="ambient-breathe absolute left-1/2 top-[-18%] z-[1] h-[42%] w-[82%]"
                style={{
                  "--ambient-x": "-50%",
                  "--ambient-y": "0%",
                  "--ambient-low": 0.18,
                  "--ambient-high": 0.48,
                  "--ambient-blur": "42px",
                  "--ambient-speed": "8.5s",
                  "--ambient-color": "rgba(255, 238, 176, 0.42)",
                }}
              />
              <div
                data-testid="ambient-breathe"
                className="ambient-breathe absolute left-1/2 bottom-[-24%] z-[3] h-[48%] w-[90%]"
                style={{
                  "--ambient-x": "-50%",
                  "--ambient-y": "0%",
                  "--ambient-low": 0.14,
                  "--ambient-high": 0.38,
                  "--ambient-blur": "56px",
                  "--ambient-speed": "9.6s",
                  "--ambient-color": "rgba(245, 158, 11, 0.36)",
                  animationDelay: "-2.1s",
                }}
              />
              <div
                data-testid="ambient-breathe"
                className="ambient-breathe absolute left-[-20%] top-[15%] z-[2] h-[62%] w-[38%]"
                style={{
                  "--ambient-x": "0%",
                  "--ambient-y": "0%",
                  "--ambient-low": 0.1,
                  "--ambient-high": 0.26,
                  "--ambient-blur": "58px",
                  "--ambient-speed": "10.4s",
                  "--ambient-color": "rgba(248, 113, 113, 0.28)",
                  animationDelay: "-3.4s",
                }}
              />
              <div
                data-testid="ambient-breathe"
                className="ambient-breathe absolute right-[-20%] top-[15%] z-[2] h-[62%] w-[38%]"
                style={{
                  "--ambient-x": "0%",
                  "--ambient-y": "0%",
                  "--ambient-low": 0.1,
                  "--ambient-high": 0.26,
                  "--ambient-blur": "58px",
                  "--ambient-speed": "10.4s",
                  "--ambient-color": "rgba(96, 165, 250, 0.24)",
                  animationDelay: "-5.2s",
                }}
              />
            </>
          )}

          <div
            data-testid="reactive-center-glow"
            className="reactive-center-glow absolute left-1/2 top-[45%] z-[2] h-[34vw] w-[56vw] rounded-full"
          />
          {activeVisualMode === "trophy" && (
            <>
              <TrophyScene
                side="left"
                theme={activeTheme}
                energyRef={soundEnergyRef}
                quality={activeQuality}
              />
              <TrophyScene
                side="right"
                theme={activeTheme}
                energyRef={soundEnergyRef}
                quality={activeQuality}
              />
            </>
          )}
          {activeVisualMode === "staff" && (
            <>
              <StaffScene side="left" />
              <StaffScene side="right" />
            </>
          )}
          {activeVisualMode === "microphone" && (
            <>
              <MicrophoneScene
                side="left"
                theme={activeTheme}
                energyRef={soundEnergyRef}
                quality={activeQuality}
              />
              <MicrophoneScene
                side="right"
                theme={activeTheme}
                energyRef={soundEnergyRef}
                quality={activeQuality}
              />
            </>
          )}

          {!isCinematicStyle && (
            <>
              <div className="absolute inset-0 z-[1] pointer-events-none">
                {lightBeams.map((beam) => (
                  <div
                    key={beam.id}
                    data-testid="stage-light-beam"
                    className="stage-light-beam absolute top-[-18%] h-[135%]"
                    style={{
                      left: beam.left,
                      width: beam.width,
                      "--beam-rotate": beam.rotate,
                      "--beam-speed": beam.speed,
                      animationDelay: beam.delay,
                    }}
                  />
                ))}
              </div>

              <div className="absolute inset-0 z-[2] pointer-events-none">
                {energyRings.map((ring) => (
                  <div
                    key={ring.id}
                    data-testid="energy-ring"
                    className="energy-ring absolute left-1/2 top-[43%] rounded-[50%]"
                    style={{
                      width: ring.width,
                      height: ring.height,
                      "--ring-opacity": ring.opacity,
                      "--ring-speed": ring.speed,
                      animationDelay: ring.delay,
                    }}
                  />
                ))}
              </div>

              <div className="absolute inset-x-[9%] bottom-[1%] h-[31%] z-[2] pointer-events-none overflow-hidden [perspective:620px]">
                <div className="absolute inset-x-0 bottom-0 h-full origin-bottom rotate-x-[66deg] border-t border-yellow-200/20 bg-[linear-gradient(90deg,transparent,rgba(245,197,79,0.12),transparent)]">
                  {floorLines.map((line) => (
                    <div
                      key={line.id}
                      data-testid="stage-floor-line"
                      className="stage-floor-line absolute bottom-0 left-1/2 h-[150%] w-[1px] origin-bottom"
                      style={{
                        transform: `translateX(-50%) rotate(${line.rotate})`,
                        animationDelay: line.delay,
                      }}
                    />
                  ))}
                  <div className="absolute left-0 right-0 bottom-[28%] h-[1px] bg-yellow-300/20" />
                  <div className="absolute left-[8%] right-[8%] bottom-[53%] h-[1px] bg-yellow-300/16" />
                  <div className="absolute left-[18%] right-[18%] bottom-[74%] h-[1px] bg-yellow-300/12" />
                </div>
              </div>

              <div className="absolute top-[10%] left-[12%] right-[12%] h-[14%] z-[4] overflow-hidden pointer-events-none">
                <div className="scanner absolute top-[35%] h-[34%] w-[24%]" />
              </div>
            </>
          )}

          {mounted &&
            visibleFloatingScores.map((item) => (
              <div
                key={item.id}
                className="floating-score absolute z-[2] font-semibold tracking-[0.12em] pointer-events-none"
                style={{
                  left: item.left,
                  "--drift": item.drift,
                  animationDelay: item.delay,
                  animationDuration: item.duration,
                  fontSize: item.size,
                }}
              >
                {item.symbol}
              </div>
            ))}

          <div
            data-testid="original-position-layout"
            className="relative z-20 w-full flex flex-col items-center text-center mt-[-2%]"
          >
            <div className="w-[20%] h-[3px] bg-gradient-to-r from-transparent via-yellow-400 to-transparent mb-[2%]" />

            <div className="mb-[2%] relative w-full flex flex-col items-center">
              <div
                className={`absolute top-1/2 left-1/2 h-[4px] w-[120%] pointer-events-none mix-blend-screen opacity-70 blur-[1px] ${isCinematicStyle ? "cinematic-lens-flare" : "-translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(255,255,255,0.78)_0%,rgba(250,204,21,0.32)_40%,transparent_100%)] rotate-[-8deg]"}`}
              />

              <p className="text-yellow-200/90 tracking-[0.6em] mb-[2%] text-[1.5vw] 2xl:text-2xl font-light uppercase drop-shadow-md">
                115 Year / Singing Competition
              </p>
              <h2 className="text-[3.5vw] font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-400 to-yellow-100 mb-[1%] tracking-[0.25em] gold-glow leading-none relative z-10">
                115年臺南市議長盃
              </h2>
              <h1
                data-testid="main-title"
                className={`gold-title ${isTitleEffectEnabled ? "is-effect-on" : "is-effect-off"} text-[10vw] font-black tracking-widest py-[1%] leading-none relative z-10`}
              >
                南瀛歌唱比賽
              </h1>
            </div>

            <div className="w-[70%] h-[2px] bg-gradient-to-r from-transparent via-yellow-500/80 to-transparent my-[1.5%] relative">
              <div className="absolute left-1/2 top-1/2 h-[0.8vw] w-[0.8vw] -translate-x-1/2 -translate-y-1/2 rotate-45 border border-yellow-100/80 bg-yellow-300/70 shadow-[0_0_24px_rgba(250,204,21,0.92)]" />
            </div>

            <div className="lower-info-zone">
              {isDateVisible && (
                <div
                  data-testid="date-pill"
                  className="date-pill-content inline-flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-yellow-500/30 blur-[20px] rounded-full" />
                  <div className="relative h-full px-[3vw] border border-yellow-400/40 rounded-full bg-black/80 backdrop-blur-md flex items-center justify-center gap-[1.5vw] shadow-[inset_0_0_15px_rgba(234,179,8,0.15)]">
                    <span className="text-yellow-400/70 tracking-[0.4em] text-[0.9vw] uppercase whitespace-nowrap">
                      比賽日期
                    </span>
                    <span className="text-[1.6vw] font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 tracking-[0.1em] whitespace-nowrap">
                      115年5月12日
                    </span>
                  </div>
                </div>
              )}

              <div
                data-testid="organizer-row"
                className="organizer-row"
                style={{ "--organizer-scale": activeOrganizerSize.scale }}
              >
                <div className="organizer-content">
                  <div className="organizer-item">
                    <span className="organizer-label">主辦單位</span>
                    <span className="organizer-name">臺南市議會</span>
                  </div>
                  <div className="organizer-divider" />
                  <div className="organizer-item">
                    <span className="organizer-label">承辦單位</span>
                    <span className="organizer-name">
                      臺南市南瀛婦女成長協會
                    </span>
                  </div>
                  <div className="organizer-divider" />
                  <div className="organizer-item">
                    <span className="organizer-label">協辦單位</span>
                    <span className="organizer-name">沈家鳳議員服務處</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="wave-wall absolute bottom-0 left-0 w-full h-[31%] px-[clamp(12px,1.2vw,28px)] z-10 opacity-[0.94]">
            <canvas
              ref={waveCanvasRef}
              data-testid="wave-canvas"
              className="wave-canvas"
              aria-hidden="true"
            />
          </div>
        </div>

        <div className="settings-dock">
          <button
            type="button"
            className={`settings-toggle ${isSettingsOpen ? "is-open" : ""}`}
            aria-label={isSettingsOpen ? "收合設定" : "展開設定"}
            aria-expanded={isSettingsOpen}
            aria-controls="stage-settings-panel"
            title={isSettingsOpen ? "收合設定" : "展開設定"}
            onClick={() => setIsSettingsOpen((open) => !open)}
          >
            <SettingsIcon />
          </button>

          {isSettingsOpen && (
            <div
              id="stage-settings-panel"
              data-testid="settings-panel"
              className="settings-panel"
            >
              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">主題</span>
                  <div
                    className="settings-button-row"
                    data-testid="stage-style-mode"
                  >
                    {STYLE_OPTIONS.map((style) => (
                      <button
                        key={style.id}
                        type="button"
                        aria-label={`切換主題為${style.name}`}
                        title={style.name}
                        onClick={() => setActiveStyleId(style.id)}
                        className={`style-mode-button ${
                          style.id === activeStyle.id ? "is-active" : ""
                        }`}
                      >
                        {style.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">主視覺</span>
                  <div
                    className="settings-button-row"
                    data-testid="stage-visual-mode"
                  >
                    {VISUAL_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`切換主視覺為${option.name}`}
                        title={option.name}
                        onClick={() => setActiveVisualMode(option.id)}
                        className={`visual-mode-button ${
                          option.id === activeVisualMode ? "is-active" : ""
                        }`}
                      >
                        <VisualIcon type={option.icon} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">配色</span>
                  <div className="theme-switcher">
                    {THEME_OPTIONS.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        aria-label={`切換配色為${theme.name}`}
                        title={theme.name}
                        onClick={() => setActiveThemeId(theme.id)}
                        className={`theme-swatch-button ${
                          theme.id === activeTheme.id ? "is-active" : ""
                        }`}
                      >
                        <span
                          className="theme-swatch"
                          style={{ background: theme.swatch }}
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">畫質</span>
                  <div
                    className="settings-button-row"
                    data-testid="stage-quality-mode"
                  >
                    {QUALITY_OPTIONS.map((quality) => (
                      <button
                        key={quality.id}
                        type="button"
                        aria-label={`切換至${quality.name}`}
                        title={quality.name}
                        onClick={() => setActiveQualityId(quality.id)}
                        className={`quality-mode-button ${
                          quality.id === activeQuality.id ? "is-active" : ""
                        }`}
                      >
                        {quality.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">單位</span>
                  <div
                    className="settings-button-row"
                    data-testid="organizer-size-mode"
                  >
                    {ORGANIZER_SIZE_OPTIONS.map((size) => (
                      <button
                        key={size.id}
                        type="button"
                        aria-label={`切換單位字體為${size.name}`}
                        title={`單位字體${size.name}`}
                        onClick={() => setActiveOrganizerSizeId(size.id)}
                        className={`quality-mode-button ${
                          size.id === activeOrganizerSize.id ? "is-active" : ""
                        }`}
                      >
                        {size.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">日期</span>
                  <button
                    type="button"
                    onClick={() => setIsDateVisible((visible) => !visible)}
                    aria-label={isDateVisible ? "隱藏比賽日期" : "顯示比賽日期"}
                    title={isDateVisible ? "隱藏比賽日期" : "顯示比賽日期"}
                    className={`control-icon-button ${
                      isDateVisible ? "is-active" : ""
                    }`}
                  >
                    <EyeIcon hidden={!isDateVisible} />
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">標題</span>
                  <button
                    type="button"
                    onClick={() =>
                      setIsTitleEffectEnabled((enabled) => !enabled)
                    }
                    aria-label={
                      isTitleEffectEnabled ? "關閉標題效果" : "開啟標題效果"
                    }
                    title={
                      isTitleEffectEnabled ? "關閉標題效果" : "開啟標題效果"
                    }
                    className={`control-icon-button ${
                      isTitleEffectEnabled ? "is-active" : ""
                    }`}
                  >
                    <SparkleIcon disabled={!isTitleEffectEnabled} />
                  </button>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">聲音</span>
                  <button
                    type="button"
                    onClick={isListening ? stopMicrophone : startMicrophone}
                    aria-label={isListening ? "停止聲音互動" : "啟用聲音互動"}
                    title={isListening ? "停止聲音互動" : "啟用聲音互動"}
                    className={`microphone-button control-icon-button ${
                      isListening ? "is-active" : ""
                    }`}
                  >
                    <MicIcon muted={!isListening} />
                  </button>
                </div>
                {errorMessage && (
                  <span className="mt-2 block text-right text-xs text-red-200">
                    {errorMessage}
                  </span>
                )}
              </div>

              <div className="settings-version">版本 {APP_VERSION_LABEL}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
