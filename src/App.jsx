import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";
import {
  AUDIO_DETECTION_OPTIONS,
  applyAudioDetectionPreset,
  createFrequencyBarPlan,
  mapFrequencyDataToBars,
  smoothEnergyValue,
} from "./audioVisualizer.js";

const NOTE_SYMBOLS = ["♪", "♫", "♬", "✦", "婦女", "南瀛"];
const DEFAULT_VISUAL_MODE = "staff";
const DEFAULT_STYLE_MODE = "stage";
const DEFAULT_ORGANIZER_SIZE = "small";
const DEFAULT_WAVE_BAR_COUNT = 120;
const DEFAULT_FLOATING_DENSITY = "low";
const DEFAULT_THREE_RENDER_FPS = "low";
const DEFAULT_AUDIO_REACTION_FPS = "low";
const DEFAULT_THREE_PIXEL_RATIO = "low";
const DEFAULT_TITLE_EFFECT_MODE = "standard";
const APP_VERSION_LABEL = "v2026.05.12.32";
const ENERGY_STYLE_UPDATE_EPSILON = 0.006;
const IDLE_WAVE_DURATION_SCALE = 2.35;
const IDLE_WAVE_SMOOTHING = 0.07;
const TITLE_ENERGY_SMOOTHING = {
  attack: 0.24,
  release: 0.1,
  max: 0.72,
};
const FLOATING_DENSITY_OPTIONS = [
  { id: "low", name: "22", value: 22 },
  { id: "medium", name: "34", value: 34 },
  { id: "high", name: "50", value: 50 },
];
const THREE_RENDER_FPS_OPTIONS = [
  { id: "low", name: "30", value: 30 },
  { id: "high", name: "60", value: 60 },
];
const AUDIO_REACTION_FPS_OPTIONS = [
  { id: "low", name: "30", value: 30 },
  { id: "medium", name: "45", value: 45 },
  { id: "high", name: "60", value: 60 },
];
const THREE_PIXEL_RATIO_OPTIONS = [
  { id: "low", name: "1.25", value: 1.25 },
  { id: "high", name: "2", value: 2 },
];
const TITLE_EFFECT_OPTIONS = [
  { id: "off", name: "關閉", shortName: "關" },
  { id: "standard", name: "標準", shortName: "標" },
  { id: "impact", name: "震撼", shortName: "震" },
];
const WAVE_BAR_OPTIONS = [
  { id: "80", name: "80", value: 80 },
  { id: "120", name: "120", value: 120 },
  { id: "160", name: "160", value: 160 },
];
const MAX_WAVE_BAR_COUNT = Math.max(
  ...WAVE_BAR_OPTIONS.map((option) => option.value),
);
const MAX_FLOATING_SCORE_COUNT = Math.max(
  ...FLOATING_DENSITY_OPTIONS.map((option) => option.value),
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
  { id: "neon", name: "夜店霓虹", shortName: "霓虹" },
];
const defaultAudioDetectionModeForStyle = (styleId) =>
  styleId === "neon" ? "dynamic" : "classic";
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

  @keyframes neon-laser-sweep {
    0%, 100% { opacity: 0.18; transform: translateX(var(--laser-x-start)) rotate(var(--laser-rotate)) scaleX(0.82); }
    45% { opacity: 0.86; transform: translateX(var(--laser-x-end)) rotate(calc(var(--laser-rotate) * -0.72)) scaleX(1.08); }
  }

  @keyframes neon-grid-pulse {
    0%, 100% { opacity: 0.34; filter: drop-shadow(0 0 8px rgba(34, 211, 238, 0.42)); }
    50% { opacity: 0.72; filter: drop-shadow(0 0 18px rgba(236, 72, 153, 0.54)); }
  }

  @keyframes neon-orbit-spin {
    from { transform: translate(-50%, -50%) rotate(0deg) scale(0.96); }
    to { transform: translate(-50%, -50%) rotate(360deg) scale(1.04); }
  }

  @keyframes neon-equalizer-idle {
    0%, 100% { transform: scaleY(0.2); opacity: 0.32; }
    50% { transform: scaleY(var(--bar-peak)); opacity: 0.82; }
  }

  @keyframes neon-visor-scan {
    0% { transform: translateX(-118%); opacity: 0; }
    18% { opacity: 0.82; }
    62% { opacity: 0.44; }
    100% { transform: translateX(118%); opacity: 0; }
  }

  @keyframes neon-sign-flicker {
    0%, 100% { opacity: 0.3; filter: brightness(0.9); }
    14% { opacity: 0.82; filter: brightness(1.35); }
    18% { opacity: 0.42; }
    22% { opacity: 0.92; filter: brightness(1.5); }
    58% { opacity: 0.56; }
  }

  @keyframes neon-fog-roll {
    from { transform: translateX(-8%) scale(1); opacity: 0.34; }
    to { transform: translateX(8%) scale(1.08); opacity: 0.54; }
  }

  @keyframes neon-burst-pulse {
    0%, 100% { opacity: calc(0.22 + var(--bass-energy) * 0.3); transform: translate(-50%, -50%) scale(0.86) rotate(0deg); }
    50% { opacity: calc(0.54 + var(--bass-energy) * 0.38); transform: translate(-50%, -50%) scale(calc(1.03 + var(--bass-energy) * 0.16)) rotate(8deg); }
  }

  @keyframes neon-tunnel-spin {
    from { transform: translate(-50%, -50%) rotate(0deg) scale(0.94); }
    to { transform: translate(-50%, -50%) rotate(360deg) scale(1.06); }
  }

  @keyframes neon-wall-flicker {
    0%, 100% { opacity: 0.34; filter: blur(0.2px) brightness(1); }
    16% { opacity: 0.88; filter: blur(0.2px) brightness(1.7); }
    21% { opacity: 0.42; }
    26% { opacity: 0.96; filter: blur(0.2px) brightness(1.9); }
    62% { opacity: 0.52; }
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
    12% { opacity: 0.54; }
    46% { transform: translateY(48vh) translateX(var(--drift)) scale(1); opacity: 0.34; }
    72% { opacity: 0.46; }
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
    container-type: inline-size;
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

  .stage-shell.is-neon-style {
    --accent-rgb: 34, 211, 238;
    --accent-soft-rgb: 168, 85, 247;
    --accent-hot-rgb: 240, 249, 255;
    --accent-deep-rgb: 236, 72, 153;
    --beam-shadow-rgb: 236, 72, 153;
    --trophy-halo: rgba(34, 211, 238, 0.34);
    --title-gradient: linear-gradient(100deg, #67e8f9 0%, #f0abfc 18%, #f8fafc 36%, #22d3ee 54%, #fb7185 72%, #a78bfa 100%);
    --wave-cool-gradient: linear-gradient(to top, rgba(88, 28, 135, 0.58), rgba(34, 211, 238, 0.76));
    --wave-hot-gradient: linear-gradient(to top, rgba(236, 72, 153, 0.96), rgba(240, 249, 255, 1));
    --wave-cool-shadow: 0 0 10px rgba(34, 211, 238, 0.34);
    --wave-hot-shadow: 0 0 24px rgba(34, 211, 238, 0.86), 0 0 38px rgba(236, 72, 153, 0.48);
    background:
      linear-gradient(180deg, rgba(2, 0, 10, 0.1) 0%, rgba(0, 0, 0, 0.78) 68%, #020005 100%),
      radial-gradient(ellipse at 50% 0%, rgba(34, 211, 238, 0.34), transparent 42%),
      radial-gradient(ellipse at 20% 35%, rgba(236, 72, 153, 0.24), transparent 40%),
      radial-gradient(ellipse at 82% 40%, rgba(168, 85, 247, 0.22), transparent 42%),
      radial-gradient(ellipse at 50% 88%, rgba(20, 184, 166, 0.18), transparent 50%),
      #030008;
  }

  .stage-shell.is-neon-style::before {
    background:
      linear-gradient(rgba(34, 211, 238, 0.028) 50%, rgba(0, 0, 0, 0) 50%),
      linear-gradient(90deg, rgba(236, 72, 153, 0.035) 1px, transparent 1px);
    background-size: 100% 3px, 32px 100%;
    opacity: 0.74;
  }

  .stage-shell.is-neon-style::after {
    background:
      radial-gradient(ellipse at center, transparent 42%, rgba(0, 0, 0, 0.74) 100%),
      linear-gradient(90deg, rgba(0, 0, 0, 0.7) 0%, transparent 20%, transparent 80%, rgba(0, 0, 0, 0.7) 100%);
  }

  .ambient-breathe {
    animation: ambient-breathe var(--ambient-speed) ease-in-out infinite;
    background: radial-gradient(ellipse at center, var(--ambient-color), transparent 70%);
    mix-blend-mode: screen;
    pointer-events: none;
  }

  .reactive-center-glow {
    opacity: calc(0.24 + var(--bass-energy) * 0.86);
    transform: translate(-50%, -50%) scale(calc(1.02 + var(--bass-energy) * 0.46), calc(0.96 + var(--bass-energy) * 0.24));
    filter: blur(calc(56px + var(--bass-energy) * 58px));
    background:
      radial-gradient(ellipse at 50% 50%, rgba(var(--accent-hot-rgb), 0.76), rgba(var(--accent-rgb), 0.46) 30%, rgba(var(--accent-deep-rgb), 0.18) 64%, transparent 80%);
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

  .stage-shell.is-neon-style .reactive-center-glow {
    opacity: calc(0.2 + var(--bass-energy) * 0.78);
    transform: translate(-50%, -50%) scale(calc(0.95 + var(--bass-energy) * 0.48));
    filter: blur(calc(66px + var(--bass-energy) * 54px));
    background:
      radial-gradient(circle at 50% 50%, rgba(240, 249, 255, 0.58), rgba(34, 211, 238, 0.34) 28%, rgba(236, 72, 153, 0.22) 54%, transparent 72%);
  }

  .neon-layer {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    overflow: hidden;
  }

  .neon-fog {
    position: absolute;
    left: -10%;
    right: -10%;
    top: 5%;
    height: 62%;
    background:
      radial-gradient(ellipse at 28% 44%, rgba(34, 211, 238, 0.18), transparent 45%),
      radial-gradient(ellipse at 70% 34%, rgba(236, 72, 153, 0.18), transparent 48%),
      radial-gradient(ellipse at 50% 80%, rgba(168, 85, 247, 0.12), transparent 56%);
    mix-blend-mode: screen;
    filter: blur(28px);
    animation: neon-fog-roll 8s ease-in-out infinite alternate;
  }

  .neon-tunnel {
    position: absolute;
    left: 50%;
    top: 43%;
    width: 96%;
    height: 180%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background:
      repeating-radial-gradient(ellipse at center, rgba(34, 211, 238, 0.18) 0 1px, transparent 2px 8%, rgba(236, 72, 153, 0.16) 9% 10%, transparent 11% 15%),
      conic-gradient(from 90deg, transparent 0deg, rgba(34, 211, 238, 0.12) 38deg, transparent 74deg, rgba(236, 72, 153, 0.14) 120deg, transparent 168deg, rgba(168, 85, 247, 0.12) 230deg, transparent 310deg);
    mix-blend-mode: screen;
    opacity: 0.42;
    filter: blur(0.3px) drop-shadow(0 0 24px rgba(34, 211, 238, 0.25));
    animation: neon-tunnel-spin 24s linear infinite;
    mask-image: radial-gradient(ellipse at center, transparent 0 18%, rgba(0, 0, 0, 0.9) 30%, rgba(0, 0, 0, 0.52) 52%, transparent 76%);
  }

  .neon-burst {
    position: absolute;
    left: 50%;
    top: 46%;
    width: 68%;
    height: 88%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    background:
      conic-gradient(from 0deg, transparent 0deg, rgba(34, 211, 238, 0.36) 16deg, transparent 34deg, rgba(236, 72, 153, 0.32) 54deg, transparent 82deg, rgba(168, 85, 247, 0.28) 108deg, transparent 138deg, rgba(34, 211, 238, 0.26) 178deg, transparent 220deg, rgba(236, 72, 153, 0.3) 266deg, transparent 360deg),
      radial-gradient(ellipse at center, rgba(240, 249, 255, 0.24), transparent 58%);
    mix-blend-mode: screen;
    filter: blur(8px);
    animation: neon-burst-pulse 3.2s ease-in-out infinite;
  }

  .neon-light-wall {
    position: absolute;
    top: 9%;
    width: 10%;
    height: 66%;
    border-radius: 999px;
    mix-blend-mode: screen;
    animation: neon-wall-flicker 3.8s ease-in-out infinite;
  }

  .neon-light-wall-left {
    left: 3.4%;
    background: linear-gradient(180deg, transparent, rgba(34, 211, 238, 0.72), rgba(236, 72, 153, 0.46), transparent);
    box-shadow: 0 0 28px rgba(34, 211, 238, 0.52), 0 0 56px rgba(34, 211, 238, 0.3);
  }

  .neon-light-wall-right {
    right: 3.4%;
    background: linear-gradient(180deg, transparent, rgba(236, 72, 153, 0.72), rgba(34, 211, 238, 0.46), transparent);
    box-shadow: 0 0 28px rgba(236, 72, 153, 0.52), 0 0 56px rgba(236, 72, 153, 0.3);
    animation-delay: -1.4s;
  }

  .neon-city {
    position: absolute;
    left: 7%;
    right: 7%;
    bottom: 29%;
    height: 24%;
    display: flex;
    align-items: flex-end;
    gap: clamp(5px, 0.75vw, 14px);
    opacity: 0.74;
    mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.82) 58%, transparent 100%);
  }

  .neon-building {
    position: relative;
    flex: 1 1 0;
    height: var(--building-height);
    min-width: 10px;
    border-radius: 2px 2px 0 0;
    background:
      linear-gradient(180deg, rgba(15, 23, 42, 0.16), rgba(3, 7, 18, 0.74)),
      repeating-linear-gradient(180deg, transparent 0 12%, var(--window-color) 13% 16%, transparent 17% 25%);
    border: 1px solid rgba(34, 211, 238, 0.12);
    box-shadow: inset 0 0 18px rgba(0, 0, 0, 0.48), 0 0 16px var(--building-glow);
  }

  .neon-building::before {
    content: "";
    position: absolute;
    left: 18%;
    right: 18%;
    top: -10px;
    height: 2px;
    border-radius: 999px;
    background: var(--sign-color);
    box-shadow: 0 0 12px var(--sign-color), 0 0 22px var(--sign-color);
    animation: neon-sign-flicker var(--sign-speed) ease-in-out infinite;
    animation-delay: var(--sign-delay);
  }

  .neon-building::after {
    content: "";
    position: absolute;
    left: 50%;
    top: -28px;
    width: 1px;
    height: 28px;
    background: linear-gradient(to top, var(--sign-color), transparent);
    box-shadow: 0 0 10px var(--sign-color);
    opacity: 0.62;
  }

  .neon-visor {
    position: absolute;
    left: 50%;
    top: 37%;
    width: 62%;
    height: 14%;
    transform: translate(-50%, -50%);
    display: grid;
    grid-template-columns: 1fr 0.18fr 1fr;
    align-items: center;
    gap: 1.2%;
    opacity: 0.54;
    mix-blend-mode: screen;
    filter: drop-shadow(0 0 24px rgba(34, 211, 238, 0.4));
  }

  .neon-visor-lens {
    position: relative;
    height: 100%;
    overflow: hidden;
    border: 1px solid rgba(240, 249, 255, 0.2);
    background:
      linear-gradient(105deg, rgba(34, 211, 238, 0.08), rgba(236, 72, 153, 0.18), rgba(34, 211, 238, 0.06)),
      repeating-linear-gradient(180deg, rgba(240, 249, 255, 0.18) 0 1px, transparent 1px 7px);
    box-shadow:
      inset 0 0 28px rgba(34, 211, 238, 0.22),
      inset 0 0 42px rgba(236, 72, 153, 0.16),
      0 0 24px rgba(34, 211, 238, 0.36),
      0 0 38px rgba(236, 72, 153, 0.22);
  }

  .neon-visor-lens-left {
    border-radius: 14px 5px 20px 8px;
    clip-path: polygon(0 18%, 100% 0, 93% 84%, 8% 100%);
  }

  .neon-visor-lens-right {
    border-radius: 5px 14px 8px 20px;
    clip-path: polygon(0 0, 100% 18%, 92% 100%, 7% 84%);
  }

  .neon-visor-lens::before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.84), transparent);
    animation: neon-visor-scan 3.2s ease-in-out infinite;
  }

  .neon-visor-bridge {
    height: 18%;
    border-radius: 999px;
    background: rgba(240, 249, 255, 0.62);
    box-shadow: 0 0 18px rgba(240, 249, 255, 0.52), 0 0 28px rgba(34, 211, 238, 0.32);
  }

  .neon-grid {
    position: absolute;
    left: -12%;
    right: -12%;
    bottom: -22%;
    height: 48%;
    transform: perspective(560px) rotateX(64deg);
    transform-origin: center bottom;
    background:
      linear-gradient(rgba(34, 211, 238, 0.34) 1px, transparent 1px),
      linear-gradient(90deg, rgba(236, 72, 153, 0.34) 1px, transparent 1px);
    background-size: 100% 13%, 7% 100%;
    border-top: 1px solid rgba(34, 211, 238, 0.38);
    animation: neon-grid-pulse 4.8s ease-in-out infinite;
    mask-image: linear-gradient(to top, rgba(0, 0, 0, 0.95), rgba(0, 0, 0, 0.68) 52%, transparent 100%);
  }

  .neon-horizon {
    position: absolute;
    left: 10%;
    right: 10%;
    bottom: 27%;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.82), rgba(236, 72, 153, 0.72), transparent);
    box-shadow: 0 0 18px rgba(34, 211, 238, 0.56), 0 0 32px rgba(236, 72, 153, 0.42);
  }

  .neon-laser {
    position: absolute;
    top: var(--laser-top);
    left: var(--laser-left);
    width: var(--laser-width);
    height: 3px;
    border-radius: 999px;
    background: linear-gradient(90deg, transparent, var(--laser-color), rgba(255, 255, 255, 0.82), transparent);
    box-shadow: 0 0 18px var(--laser-color), 0 0 34px var(--laser-color);
    mix-blend-mode: screen;
    animation: neon-laser-sweep var(--laser-speed) ease-in-out infinite;
    animation-delay: var(--laser-delay);
  }

  .neon-orbit {
    position: absolute;
    left: 50%;
    top: 44%;
    border-radius: 50%;
    border: 1px solid rgba(34, 211, 238, 0.34);
    box-shadow: 0 0 22px rgba(34, 211, 238, 0.2), inset 0 0 28px rgba(236, 72, 153, 0.12);
    mix-blend-mode: screen;
    animation: neon-orbit-spin var(--orbit-speed) linear infinite;
  }

  .neon-orbit-a {
    width: 56%;
    height: 118%;
    --orbit-speed: 22s;
  }

  .neon-orbit-b {
    width: 76%;
    height: 150%;
    border-color: rgba(236, 72, 153, 0.26);
    animation-direction: reverse;
    --orbit-speed: 31s;
  }

  .neon-equalizer {
    position: absolute;
    left: 50%;
    bottom: 26%;
    display: flex;
    gap: 5px;
    transform: translateX(-50%);
    opacity: 0.58;
    mix-blend-mode: screen;
  }

  .neon-equalizer span {
    width: clamp(2px, 0.22vw, 6px);
    height: clamp(18px, 3.8vw, 76px);
    border-radius: 999px;
    transform-origin: bottom;
    background: linear-gradient(to top, rgba(34, 211, 238, 0.24), rgba(236, 72, 153, 0.76), rgba(255, 255, 255, 0.86));
    box-shadow: 0 0 14px rgba(34, 211, 238, 0.46), 0 0 22px rgba(236, 72, 153, 0.3);
    animation: neon-equalizer-idle var(--bar-speed) ease-in-out infinite;
    animation-delay: var(--bar-delay);
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

  .neon-lens-flare {
    background: radial-gradient(ellipse 50% 50% at 50% 50%, rgba(255, 255, 255, 0.74) 0%, rgba(34, 211, 238, 0.34) 34%, rgba(236, 72, 153, 0.24) 52%, transparent 100%);
    transform: translate(-50%, -50%) rotate(-6deg);
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

  .stage-title-kicker {
    font-size: 1.5vw;
    font-size: 1.5cqw;
  }

  .stage-title-prefix {
    font-size: 3.5vw;
    font-size: 3.5cqw;
  }

  .stage-main-title {
    font-size: 10vw;
    font-size: 10cqw;
  }

  .title-center-diamond {
    width: 0.8vw;
    height: 0.8vw;
    width: 0.8cqw;
    height: 0.8cqw;
  }

  .neon-title-sign {
    display: inline-block;
    isolation: isolate;
    color: #fff;
    -webkit-text-fill-color: #fff;
    -webkit-text-stroke: clamp(0.35px, 0.035vw, 0.9px) rgba(255, 255, 255, 0.92);
    -webkit-text-stroke: clamp(0.35px, 0.035cqw, 0.9px) rgba(255, 255, 255, 0.92);
    font-family: "PingFang TC", "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif;
    text-shadow:
      0 0 3px rgba(255, 255, 255, 1),
      0 0 7px rgba(255, 255, 255, 0.92),
      0 0 13px rgba(255, 43, 214, 0.88),
      0 0 26px rgba(255, 43, 214, 0.72),
      0 0 52px rgba(236, 72, 153, 0.55),
      0 0 92px rgba(34, 211, 238, 0.36);
    filter:
      drop-shadow(0 16px 20px rgba(0, 0, 0, 1))
      drop-shadow(0 0 10px rgba(255, 255, 255, 0.22));
    animation: title-rise 980ms cubic-bezier(.2,.84,.25,1) both;
  }

  .neon-title-sign::before,
  .neon-title-sign::after {
    content: "";
    position: absolute;
    left: -5%;
    right: -5%;
    pointer-events: none;
    z-index: -1;
  }

  .neon-title-sign::before {
    top: 4%;
    bottom: 3%;
    border: 1px solid rgba(34, 211, 238, 0.58);
    border-radius: 999px;
    background:
      linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.08), rgba(236, 72, 153, 0.08), transparent),
      rgba(0, 0, 0, 0.08);
    box-shadow:
      inset 0 0 20px rgba(34, 211, 238, 0.32),
      inset 0 0 34px rgba(236, 72, 153, 0.2),
      0 0 16px rgba(34, 211, 238, 0.42),
      0 0 34px rgba(236, 72, 153, 0.24);
    opacity: 0.52;
    transform-origin: center;
  }

  .neon-title-sign::after {
    top: 50%;
    height: 2px;
    transform: translateY(-50%);
    background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.72), rgba(255, 255, 255, 0.78), rgba(236, 72, 153, 0.72), transparent);
    box-shadow:
      0 0 10px rgba(34, 211, 238, 0.7),
      0 0 22px rgba(236, 72, 153, 0.42);
    opacity: 0.36;
  }

  .neon-title-sign.is-effect-on {
    text-shadow:
      0 0 3px rgba(255, 255, 255, 1),
      0 0 calc(7px + 5px * var(--title-energy)) rgba(255, 255, 255, 0.94),
      0 0 calc(13px + 12px * var(--title-energy)) rgba(255, 43, 214, calc(0.74 + 0.22 * var(--title-energy))),
      0 0 calc(26px + 28px * var(--title-energy)) rgba(255, 43, 214, calc(0.56 + 0.28 * var(--title-energy))),
      0 0 calc(52px + 46px * var(--title-energy)) rgba(236, 72, 153, calc(0.38 + 0.28 * var(--title-energy))),
      0 0 calc(92px + 78px * var(--title-energy)) rgba(34, 211, 238, calc(0.24 + 0.28 * var(--title-energy)));
    filter:
      drop-shadow(0 16px 20px rgba(0, 0, 0, 1))
      drop-shadow(0 0 calc(10px + 16px * var(--title-energy)) rgba(255, 255, 255, calc(0.18 + 0.26 * var(--title-energy))));
  }

  .neon-title-sign.is-effect-on::before {
    opacity: calc(0.46 + 0.24 * var(--title-energy));
    box-shadow:
      inset 0 0 calc(20px + 18px * var(--title-energy)) rgba(34, 211, 238, calc(0.26 + 0.2 * var(--title-energy))),
      inset 0 0 calc(34px + 22px * var(--title-energy)) rgba(236, 72, 153, calc(0.16 + 0.18 * var(--title-energy))),
      0 0 calc(16px + 22px * var(--title-energy)) rgba(34, 211, 238, calc(0.34 + 0.28 * var(--title-energy))),
      0 0 calc(34px + 38px * var(--title-energy)) rgba(236, 72, 153, calc(0.2 + 0.24 * var(--title-energy)));
  }

  .neon-title-sign.is-effect-impact {
    animation: title-rise 980ms cubic-bezier(.2,.84,.25,1) both;
    text-shadow:
      0 0 3px rgba(255, 255, 255, 1),
      0 0 calc(8px + 7px * var(--title-energy)) rgba(255, 255, 255, 0.96),
      0 0 calc(16px + 18px * var(--title-energy)) rgba(255, 43, 214, calc(0.8 + 0.18 * var(--title-energy))),
      0 0 calc(32px + 38px * var(--title-energy)) rgba(255, 43, 214, calc(0.62 + 0.3 * var(--title-energy))),
      0 0 calc(62px + 64px * var(--title-energy)) rgba(236, 72, 153, calc(0.42 + 0.34 * var(--title-energy))),
      0 0 calc(104px + 96px * var(--title-energy)) rgba(34, 211, 238, calc(0.28 + 0.36 * var(--title-energy)));
  }

  .neon-title-sign.is-effect-impact::before {
    transform: scale(calc(1 + var(--bass-energy) * 0.035), calc(1 + var(--bass-energy) * 0.12));
    opacity: calc(0.5 + var(--bass-energy) * 0.28);
    border-color: rgba(34, 211, 238, calc(0.5 + var(--bass-energy) * 0.3));
    box-shadow:
      inset 0 0 calc(22px + 32px * var(--bass-energy)) rgba(34, 211, 238, calc(0.28 + 0.28 * var(--bass-energy))),
      inset 0 0 calc(36px + 44px * var(--bass-energy)) rgba(236, 72, 153, calc(0.18 + 0.24 * var(--bass-energy))),
      0 0 calc(18px + 34px * var(--bass-energy)) rgba(34, 211, 238, calc(0.38 + 0.34 * var(--bass-energy))),
      0 0 calc(38px + 58px * var(--bass-energy)) rgba(236, 72, 153, calc(0.24 + 0.32 * var(--bass-energy)));
  }

  .neon-title-sign.is-effect-impact::after {
    opacity: calc(0.32 + var(--title-energy) * 0.34);
    background:
      linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.66), rgba(255, 255, 255, 0.74), rgba(236, 72, 153, 0.64), transparent);
    box-shadow:
      0 0 calc(10px + 16px * var(--title-energy)) rgba(34, 211, 238, 0.48),
      0 0 calc(18px + 26px * var(--title-energy)) rgba(236, 72, 153, 0.28);
  }

  .lower-info-zone {
    position: relative;
    width: 100%;
    height: clamp(104px, 13vw, 250px);
    height: clamp(104px, 13cqw, 250px);
    margin-top: 1%;
  }

  .date-pill-content {
    position: absolute;
    top: 0;
    left: 50%;
    width: max-content;
    max-width: 92%;
    height: clamp(34px, 3.8vw, 78px);
    height: clamp(34px, 3.8cqw, 78px);
    transform: translateX(-50%);
  }

  .date-pill-frame {
    gap: 1.5vw;
    gap: 1.5cqw;
    padding-left: 3vw;
    padding-right: 3vw;
    padding-left: 3cqw;
    padding-right: 3cqw;
  }

  .date-pill-label {
    font-size: 0.9vw;
    font-size: 0.9cqw;
  }

  .date-pill-value {
    font-size: 1.6vw;
    font-size: 1.6cqw;
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
    color: rgba(var(--accent-hot-rgb), 0.34);
    mix-blend-mode: screen;
    text-shadow:
      0 0 12px rgba(var(--accent-hot-rgb), 0.42),
      0 0 28px rgba(var(--accent-rgb), 0.34);
    filter: drop-shadow(0 0 18px rgba(var(--accent-rgb), 0.3));
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
    bottom: clamp(8px, 0.9vw, 22px);
    bottom: clamp(8px, 0.9cqw, 22px);
    width: 100%;
    min-height: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
  }

  .organizer-content {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 2px minmax(0, 1fr) 2px minmax(0, 1fr);
    align-items: center;
    justify-items: center;
    gap: clamp(0.9vw, 5vw, calc(5vw / var(--organizer-scale)));
    gap: clamp(0.9cqw, 5cqw, calc(5cqw / var(--organizer-scale)));
    width: calc(88vw / var(--organizer-scale));
    width: calc(88cqw / var(--organizer-scale));
    color: rgb(229, 231, 235);
    font-size: 1.2vw;
    font-size: 1.2cqw;
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
    gap: clamp(3px, 0.34cqw, 8px);
    width: 100%;
    min-width: 0;
    max-width: 31vw;
    max-width: 31cqw;
  }

  .organizer-label {
    color: rgba(var(--accent-rgb), 0.9);
    font-size: 1vw;
    font-size: 1cqw;
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
    height: clamp(26px, 2.5vw, 72px);
    height: clamp(26px, 2.5cqw, 72px);
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
    durationValue: 1.25 + Math.random() * 1.65,
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

function NeonStyleLayer() {
  return (
    <div
      data-testid="neon-style-layer"
      className="neon-layer"
      aria-hidden="true"
    >
      <div className="neon-orbit neon-orbit-a" />
      <div className="neon-orbit neon-orbit-b" />
      <div className="neon-fog" />
      <div className="neon-tunnel" />
      <div className="neon-burst" />
      <div className="neon-light-wall neon-light-wall-left" />
      <div className="neon-light-wall neon-light-wall-right" />
      <div className="neon-city">
        {[42, 68, 54, 86, 62, 74, 48, 92, 58, 78, 50, 66].map(
          (height, index) => (
            <span
              key={index}
              className="neon-building"
              style={{
                "--building-height": `${height}%`,
                "--window-color":
                  index % 3 === 0
                    ? "rgba(34, 211, 238, 0.42)"
                    : index % 3 === 1
                      ? "rgba(236, 72, 153, 0.38)"
                      : "rgba(168, 85, 247, 0.34)",
                "--building-glow":
                  index % 2 === 0
                    ? "rgba(34, 211, 238, 0.2)"
                    : "rgba(236, 72, 153, 0.18)",
                "--sign-color":
                  index % 2 === 0
                    ? "rgba(34, 211, 238, 0.82)"
                    : "rgba(236, 72, 153, 0.82)",
                "--sign-speed": `${2.4 + (index % 4) * 0.36}s`,
                "--sign-delay": `${index * -0.14}s`,
              }}
            />
          ),
        )}
      </div>
      <div className="neon-visor">
        <span className="neon-visor-lens neon-visor-lens-left" />
        <span className="neon-visor-bridge" />
        <span className="neon-visor-lens neon-visor-lens-right" />
      </div>
      <div className="neon-grid" />
      <div className="neon-horizon" />
      {[
        {
          top: "12%",
          left: "-18%",
          width: "58%",
          rotate: "18deg",
          color: "rgba(34, 211, 238, 0.86)",
          speed: "5.8s",
          delay: "-0.8s",
          start: "-10%",
          end: "18%",
        },
        {
          top: "22%",
          left: "62%",
          width: "54%",
          rotate: "-22deg",
          color: "rgba(236, 72, 153, 0.86)",
          speed: "6.6s",
          delay: "-2.4s",
          start: "10%",
          end: "-16%",
        },
        {
          top: "36%",
          left: "-10%",
          width: "52%",
          rotate: "-12deg",
          color: "rgba(168, 85, 247, 0.78)",
          speed: "7.2s",
          delay: "-4s",
          start: "-6%",
          end: "14%",
        },
        {
          top: "48%",
          left: "60%",
          width: "48%",
          rotate: "14deg",
          color: "rgba(45, 212, 191, 0.72)",
          speed: "6.1s",
          delay: "-3.2s",
          start: "8%",
          end: "-12%",
        },
      ].map((laser, index) => (
        <span
          key={index}
          className="neon-laser"
          style={{
            "--laser-top": laser.top,
            "--laser-left": laser.left,
            "--laser-width": laser.width,
            "--laser-rotate": laser.rotate,
            "--laser-color": laser.color,
            "--laser-speed": laser.speed,
            "--laser-delay": laser.delay,
            "--laser-x-start": laser.start,
            "--laser-x-end": laser.end,
          }}
        />
      ))}
      <div className="neon-equalizer">
        {Array.from({ length: 22 }).map((_, index) => (
          <span
            key={index}
            style={{
              "--bar-peak": 0.28 + ((index * 7) % 11) * 0.07,
              "--bar-speed": `${1.4 + (index % 5) * 0.18}s`,
              "--bar-delay": `${index * -0.08}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [mounted, setMounted] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [activeStyleId, setActiveStyleId] = useState(DEFAULT_STYLE_MODE);
  const [activeThemeId, setActiveThemeId] = useState(THEME_OPTIONS[0].id);
  const [activeVisualMode, setActiveVisualMode] = useState(DEFAULT_VISUAL_MODE);
  const [activeFloatingDensityId, setActiveFloatingDensityId] = useState(
    DEFAULT_FLOATING_DENSITY,
  );
  const [activeThreeRenderFpsId, setActiveThreeRenderFpsId] = useState(
    DEFAULT_THREE_RENDER_FPS,
  );
  const [activeAudioReactionFpsId, setActiveAudioReactionFpsId] = useState(
    DEFAULT_AUDIO_REACTION_FPS,
  );
  const [activeAudioDetectionModeId, setActiveAudioDetectionModeId] = useState(
    () => defaultAudioDetectionModeForStyle(DEFAULT_STYLE_MODE),
  );
  const [activeThreePixelRatioId, setActiveThreePixelRatioId] = useState(
    DEFAULT_THREE_PIXEL_RATIO,
  );
  const [activeWaveBarCountId, setActiveWaveBarCountId] = useState(
    String(DEFAULT_WAVE_BAR_COUNT),
  );
  const [activeOrganizerSizeId, setActiveOrganizerSizeId] = useState(
    DEFAULT_ORGANIZER_SIZE,
  );
  const [isDateVisible, setIsDateVisible] = useState(true);
  const [activeTitleEffectMode, setActiveTitleEffectMode] = useState(
    DEFAULT_TITLE_EFFECT_MODE,
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const stageRef = useRef(null);
  const waveCanvasRef = useRef(null);
  const waveTargetsRef = useRef(new Float32Array(MAX_WAVE_BAR_COUNT));
  const waveLevelsRef = useRef(new Float32Array(MAX_WAVE_BAR_COUNT));
  const waveFrameRef = useRef(null);
  const soundEnergyRef = useRef(0);
  const titleEnergyRef = useRef(0);
  const stageEnergyStyleRef = useRef({
    bass: Number.NaN,
    sound: Number.NaN,
    title: Number.NaN,
  });
  const audioReactionFpsRef = useRef(AUDIO_REACTION_FPS_OPTIONS[0].value);
  const waveBarCountRef = useRef(DEFAULT_WAVE_BAR_COUNT);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const audioDetectionPresetRef = useRef(AUDIO_DETECTION_OPTIONS[0]);
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
  const isNeonStyle = activeStyle.id === "neon";
  const titleEffectClass =
    activeTitleEffectMode === "off"
      ? "is-effect-off"
      : activeTitleEffectMode === "impact"
        ? "is-effect-on is-effect-impact"
        : "is-effect-on";
  const handleStyleChange = useCallback((styleId) => {
    setActiveStyleId(styleId);
    setActiveAudioDetectionModeId(defaultAudioDetectionModeForStyle(styleId));
  }, []);
  const activeFloatingDensity = useMemo(
    () =>
      FLOATING_DENSITY_OPTIONS.find(
        (option) => option.id === activeFloatingDensityId,
      ) || FLOATING_DENSITY_OPTIONS[0],
    [activeFloatingDensityId],
  );
  const activeThreeRenderFps = useMemo(
    () =>
      THREE_RENDER_FPS_OPTIONS.find(
        (option) => option.id === activeThreeRenderFpsId,
      ) || THREE_RENDER_FPS_OPTIONS[0],
    [activeThreeRenderFpsId],
  );
  const activeAudioReactionFps = useMemo(
    () =>
      AUDIO_REACTION_FPS_OPTIONS.find(
        (option) => option.id === activeAudioReactionFpsId,
      ) || AUDIO_REACTION_FPS_OPTIONS[0],
    [activeAudioReactionFpsId],
  );
  const activeAudioDetectionMode = useMemo(
    () =>
      AUDIO_DETECTION_OPTIONS.find(
        (option) => option.id === activeAudioDetectionModeId,
      ) || AUDIO_DETECTION_OPTIONS[0],
    [activeAudioDetectionModeId],
  );
  const activeThreePixelRatio = useMemo(
    () =>
      THREE_PIXEL_RATIO_OPTIONS.find(
        (option) => option.id === activeThreePixelRatioId,
      ) || THREE_PIXEL_RATIO_OPTIONS[0],
    [activeThreePixelRatioId],
  );
  const activeThreeQuality = useMemo(
    () => ({
      threeRenderFps: activeThreeRenderFps.value,
      maxThreePixelRatio: activeThreePixelRatio.value,
    }),
    [activeThreePixelRatio.value, activeThreeRenderFps.value],
  );
  const activeWaveBarOption = useMemo(
    () =>
      WAVE_BAR_OPTIONS.find((option) => option.id === activeWaveBarCountId) ||
      WAVE_BAR_OPTIONS[1],
    [activeWaveBarCountId],
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
    () => floatingScores.slice(0, activeFloatingDensity.value),
    [activeFloatingDensity.value, floatingScores],
  );
  const lightBeams = useMemo(() => createLightBeams(), []);
  const energyRings = useMemo(() => createEnergyRings(), []);
  const floorLines = useMemo(() => createFloorLines(), []);
  const particles = useMemo(() => createParticles(), []);

  const setStageEnergyProperty = useCallback(
    (key, propertyName, energy, force = false) => {
      const numericEnergy = Number(energy) || 0;
      const previousEnergy = stageEnergyStyleRef.current[key];
      if (
        stageRef.current &&
        (force ||
          !Number.isFinite(previousEnergy) ||
          Math.abs(previousEnergy - numericEnergy) >=
            ENERGY_STYLE_UPDATE_EPSILON)
      ) {
        stageRef.current.style.setProperty(
          propertyName,
          String(Math.round(numericEnergy * 1000) / 1000),
        );
        stageEnergyStyleRef.current[key] = numericEnergy;
      }
      return numericEnergy;
    },
    [],
  );

  const setSoundEnergy = useCallback(
    (energy, force = false) => {
      soundEnergyRef.current = setStageEnergyProperty(
        "sound",
        "--sound-energy",
        energy,
        force,
      );
    },
    [setStageEnergyProperty],
  );

  const setBassEnergy = useCallback(
    (energy, force = false) => {
      setStageEnergyProperty("bass", "--bass-energy", energy, force);
    },
    [setStageEnergyProperty],
  );

  const setTitleEnergy = useCallback(
    (energy, force = false) => {
      const nextEnergy = force
        ? 0
        : smoothEnergyValue(
            titleEnergyRef.current,
            energy,
            TITLE_ENERGY_SMOOTHING,
          );
      titleEnergyRef.current = setStageEnergyProperty(
        "title",
        "--title-energy",
        nextEnergy,
        force,
      );
    },
    [setStageEnergyProperty],
  );

  const stopMicrophone = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    analyserRef.current = null;

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

    setSoundEnergy(0, true);
    setBassEnergy(0, true);
    setTitleEnergy(0, true);
    setIsListening(false);
  }, [setBassEnergy, setSoundEnergy, setTitleEnergy]);

  useEffect(() => {
    setMounted(true);
    return () => stopMicrophone();
  }, [stopMicrophone]);

  useEffect(() => {
    audioReactionFpsRef.current = activeAudioReactionFps.value;
  }, [activeAudioReactionFps.value]);

  useEffect(() => {
    audioDetectionPresetRef.current = activeAudioDetectionMode;
    if (analyserRef.current) {
      applyAudioDetectionPreset(analyserRef.current, activeAudioDetectionMode);
    }
  }, [activeAudioDetectionMode]);

  useEffect(() => {
    waveBarCountRef.current = activeWaveBarOption.value;
    waveTargetsRef.current.fill(0);
    waveLevelsRef.current.fill(0);
  }, [activeWaveBarOption.value]);

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
    let barLayout = null;
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

    const refreshBarLayout = (count = waveBarCountRef.current) => {
      const safeCount = Math.max(1, count);
      const preferredGap = Math.min(5, Math.max(0.6, logicalWidth * 0.0018));
      const gap = Math.min(preferredGap, (logicalWidth / safeCount) * 0.55);
      const barWidth = Math.max(
        0.35,
        (logicalWidth - gap * (safeCount - 1)) / safeCount,
      );
      const xPositions = new Float32Array(safeCount);
      for (let index = 0; index < safeCount; index += 1) {
        xPositions[index] = index * (barWidth + gap);
      }
      barLayout = {
        barWidth,
        count: safeCount,
        radius: Math.min(5, Math.max(2, logicalWidth * 0.0022)),
        xPositions,
      };
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
      refreshBarLayout();
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
      const count = waveBarCountRef.current;
      if (!barLayout || barLayout.count !== count) {
        refreshBarLayout(count);
      }
      const levels = waveLevelsRef.current;
      const targets = waveTargetsRef.current;
      const time = frameTime / 1000;
      const activePreset = audioDetectionPresetRef.current;
      const { barWidth, radius, xPositions } = barLayout;

      context.clearRect(0, 0, logicalWidth, logicalHeight);

      context.save();
      context.globalCompositeOperation = "lighter";
      context.shadowBlur = 14;
      context.shadowColor = `rgba(${accent}, 0.42)`;
      context.fillStyle = `rgba(${accent}, 0.13)`;
      for (let index = 0; index < count; index += 1) {
        const pattern = waves[index];
        const phase =
          ((time + pattern.delayValue) /
            (pattern.durationValue * IDLE_WAVE_DURATION_SCALE)) *
          Math.PI *
          2;
        const idleTarget =
          0.16 + Math.pow((Math.sin(phase) + 1) / 2, 1.35) * 0.84;
        const target = isListening ? targets[index] : idleTarget;
        const difference = target - levels[index];
        if (!isListening) {
          levels[index] += difference * IDLE_WAVE_SMOOTHING;
        } else if (difference > 0) {
          levels[index] += difference * activePreset.attackSmoothing;
        } else {
          levels[index] = Math.max(
            target,
            levels[index] * activePreset.releaseDecay,
          );
        }
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
        const x = xPositions[index];
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
        const x = xPositions[index];
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
  }, [activeTheme, isCinematicStyle, isListening, waves]);

  const startMicrophone = useCallback(async () => {
    if (isListening) {
      return;
    }

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("UNSUPPORTED_MICROPHONE");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioContextClass =
        window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        stream.getTracks().forEach((track) => track.stop());
        throw new Error("UNSUPPORTED_AUDIO_CONTEXT");
      }

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);

      applyAudioDetectionPreset(analyser, activeAudioDetectionMode);
      source.connect(analyser);

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      mediaStreamRef.current = stream;
      sourceRef.current = source;
      stream.getTracks().forEach((track) =>
        track.addEventListener("ended", () => stopMicrophone(), {
          once: true,
        }),
      );

      let bufferLength = analyser.frequencyBinCount;
      let dataArray = new Uint8Array(bufferLength);
      let audioBarPlan = createFrequencyBarPlan({
        barCount: waveBarCountRef.current / 2,
        fftSize: analyser.fftSize,
        sampleRate: audioContext.sampleRate,
      });
      let audioBarBuffer = new Float32Array(audioBarPlan.barCount);
      let lastAudioFrameTime = Number.NEGATIVE_INFINITY;

      const refreshAudioBarPlan = (barCount) => {
        audioBarPlan = createFrequencyBarPlan({
          barCount,
          fftSize: analyser.fftSize,
          sampleRate: audioContext.sampleRate,
        });
        audioBarBuffer = new Float32Array(audioBarPlan.barCount);
      };

      setIsListening(true);
      setErrorMessage("");

      const renderFrame = (frameTime = 0) => {
        animationRef.current = requestAnimationFrame(renderFrame);
        const minAudioFrameDuration = 1000 / audioReactionFpsRef.current;
        if (frameTime - lastAudioFrameTime < minAudioFrameDuration) {
          return;
        }
        lastAudioFrameTime = frameTime;
        if (analyser.frequencyBinCount !== bufferLength) {
          bufferLength = analyser.frequencyBinCount;
          dataArray = new Uint8Array(bufferLength);
          refreshAudioBarPlan(waveBarCountRef.current / 2);
        }
        analyser.getByteFrequencyData(dataArray);

        const activeWaveBarCount = waveBarCountRef.current;
        const activeWavePairCount = activeWaveBarCount / 2;
        const waveTargets = waveTargetsRef.current;
        if (audioBarPlan.barCount !== activeWavePairCount) {
          refreshAudioBarPlan(activeWavePairCount);
        }
        const audioBars = mapFrequencyDataToBars(dataArray, {
          barPlan: audioBarPlan,
          outputBars: audioBarBuffer,
          preset: audioDetectionPresetRef.current,
        });

        for (let i = 0; i < activeWavePairCount; i += 1) {
          const response = audioBars.bars[i] || 0;
          const scale = 0.12 + response * 1.95;

          waveTargets[i] = scale;
          waveTargets[activeWaveBarCount - 1 - i] = scale;
        }

        setSoundEnergy(audioBars.overallEnergy);
        setBassEnergy(audioBars.bassEnergy);
        setTitleEnergy(audioBars.titleEnergy);
      };

      renderFrame(performance.now());
    } catch (error) {
      console.error("無法存取麥克風: ", error);
      stopMicrophone();
      if (error?.message === "UNSUPPORTED_MICROPHONE") {
        setErrorMessage(
          "此瀏覽器不支援麥克風互動，請改用新版 Chrome 或 Edge。",
        );
      } else {
        setErrorMessage("無法存取麥克風，請確認瀏覽器已允許權限。");
      }
    }
  }, [activeAudioDetectionMode, isListening, stopMicrophone]);

  useEffect(() => {
    const timer = window.setTimeout(() => startMicrophone(), 120);
    return () => window.clearTimeout(timer);
    // Intentional: only request the microphone once on initial page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          className={`stage-shell absolute inset-0 overflow-hidden flex items-center justify-center font-sans select-none ${isListening ? "is-listening" : ""} ${isCinematicStyle ? "is-cinematic-style" : ""} ${isNeonStyle ? "is-neon-style" : ""}`}
          style={activeTheme.vars}
        >
          {isCinematicStyle ? (
            <CinematicStyleLayer mounted={mounted} particles={particles} />
          ) : isNeonStyle ? (
            <NeonStyleLayer />
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
            className={`reactive-center-glow absolute left-1/2 z-[2] rounded-full ${isCinematicStyle || isNeonStyle ? "top-[45%] h-[34vw] w-[56vw]" : "top-[48%] h-[30%] w-[118%]"}`}
          />
          {activeVisualMode === "trophy" && (
            <>
              <TrophyScene
                side="left"
                theme={activeTheme}
                energyRef={soundEnergyRef}
                quality={activeThreeQuality}
              />
              <TrophyScene
                side="right"
                theme={activeTheme}
                energyRef={soundEnergyRef}
                quality={activeThreeQuality}
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
                quality={activeThreeQuality}
              />
              <MicrophoneScene
                side="right"
                theme={activeTheme}
                energyRef={soundEnergyRef}
                quality={activeThreeQuality}
              />
            </>
          )}

          {!isCinematicStyle && !isNeonStyle && (
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
                className={`absolute top-1/2 left-1/2 h-[4px] w-[120%] pointer-events-none mix-blend-screen opacity-70 blur-[1px] ${
                  isCinematicStyle
                    ? "cinematic-lens-flare"
                    : isNeonStyle
                      ? "neon-lens-flare"
                      : "-translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_50%_50%_at_50%_50%,rgba(255,255,255,0.78)_0%,rgba(250,204,21,0.32)_40%,transparent_100%)] rotate-[-8deg]"
                }`}
              />

              <p className="stage-title-kicker text-yellow-200/90 tracking-[0.6em] mb-[2%] font-light uppercase drop-shadow-md">
                115 Year / Singing Competition
              </p>
              <h2 className="stage-title-prefix font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-100 via-yellow-400 to-yellow-100 mb-[1%] tracking-[0.25em] gold-glow leading-none relative z-10">
                115年臺南市議長盃
              </h2>
              <h1
                data-testid="main-title"
                className={`${isNeonStyle ? "neon-title-sign" : "gold-title"} ${titleEffectClass} stage-main-title font-black tracking-widest py-[1%] leading-none relative z-10`}
              >
                南瀛歌唱比賽
              </h1>
            </div>

            <div className="w-[70%] h-[2px] bg-gradient-to-r from-transparent via-yellow-500/80 to-transparent my-[1.5%] relative">
              <div className="title-center-diamond absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-45 border border-yellow-100/80 bg-yellow-300/70 shadow-[0_0_24px_rgba(250,204,21,0.92)]" />
            </div>

            <div className="lower-info-zone">
              {isDateVisible && (
                <div
                  data-testid="date-pill"
                  className="date-pill-content inline-flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-yellow-500/30 blur-[20px] rounded-full" />
                  <div className="date-pill-frame relative h-full border border-yellow-400/40 rounded-full bg-black/80 backdrop-blur-md flex items-center justify-center shadow-[inset_0_0_15px_rgba(234,179,8,0.15)]">
                    <span className="date-pill-label text-yellow-400/70 tracking-[0.4em] uppercase whitespace-nowrap">
                      比賽日期
                    </span>
                    <span className="date-pill-value font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500 tracking-[0.1em] whitespace-nowrap">
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
                        onClick={() => handleStyleChange(style.id)}
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
                  <span className="settings-label">飄浮</span>
                  <div
                    className="settings-button-row"
                    data-testid="floating-density-mode"
                  >
                    {FLOATING_DENSITY_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`切換漂浮音符數量為${option.name}`}
                        title={`漂浮音符${option.name}`}
                        onClick={() => setActiveFloatingDensityId(option.id)}
                        className={`quality-mode-button ${
                          option.id === activeFloatingDensity.id
                            ? "is-active"
                            : ""
                        }`}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">3D</span>
                  <div
                    className="settings-button-row"
                    data-testid="three-render-fps-mode"
                  >
                    {THREE_RENDER_FPS_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`切換3D更新率為${option.name} FPS`}
                        title={`3D ${option.name} FPS`}
                        onClick={() => setActiveThreeRenderFpsId(option.id)}
                        className={`quality-mode-button ${
                          option.id === activeThreeRenderFps.id
                            ? "is-active"
                            : ""
                        }`}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">聲音</span>
                  <div
                    className="settings-button-row"
                    data-testid="audio-reaction-fps-mode"
                  >
                    {AUDIO_REACTION_FPS_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`切換聲音反應更新率為${option.name} FPS`}
                        title={`聲音 ${option.name} FPS`}
                        onClick={() => setActiveAudioReactionFpsId(option.id)}
                        className={`quality-mode-button ${
                          option.id === activeAudioReactionFps.id
                            ? "is-active"
                            : ""
                        }`}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">偵測</span>
                  <div
                    className="settings-button-row"
                    data-testid="audio-detection-mode"
                  >
                    {AUDIO_DETECTION_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`切換聲音偵測為${option.name}`}
                        title={`聲音偵測${option.name}`}
                        onClick={() => setActiveAudioDetectionModeId(option.id)}
                        className={`quality-mode-button ${
                          option.id === activeAudioDetectionMode.id
                            ? "is-active"
                            : ""
                        }`}
                      >
                        {option.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">像素</span>
                  <div
                    className="settings-button-row"
                    data-testid="three-pixel-ratio-mode"
                  >
                    {THREE_PIXEL_RATIO_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`切換3D像素倍率為${option.name}倍`}
                        title={`3D像素倍率 ${option.name}x`}
                        onClick={() => setActiveThreePixelRatioId(option.id)}
                        className={`quality-mode-button ${
                          option.id === activeThreePixelRatio.id
                            ? "is-active"
                            : ""
                        }`}
                      >
                        {option.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">聲波</span>
                  <div
                    className="settings-button-row"
                    data-testid="wave-bar-count-mode"
                  >
                    {WAVE_BAR_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        aria-label={`切換聲波條數為${option.name}條`}
                        title={`聲波${option.name}條`}
                        onClick={() => setActiveWaveBarCountId(option.id)}
                        className={`quality-mode-button ${
                          option.id === activeWaveBarOption.id
                            ? "is-active"
                            : ""
                        }`}
                      >
                        {option.name}
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
                  <div className="settings-button-row">
                    {TITLE_EFFECT_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={`quality-mode-button ${
                          activeTitleEffectMode === option.id ? "is-active" : ""
                        }`}
                        onClick={() => setActiveTitleEffectMode(option.id)}
                        aria-label={`標題特效${option.name}`}
                        title={`標題特效${option.name}`}
                      >
                        {option.shortName}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-row">
                  <span className="settings-label">麥克風</span>
                  <button
                    type="button"
                    onClick={isListening ? stopMicrophone : startMicrophone}
                    aria-label={
                      isListening ? "停止麥克風收音" : "開啟麥克風收音"
                    }
                    title={isListening ? "停止麥克風收音" : "開啟麥克風收音"}
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
