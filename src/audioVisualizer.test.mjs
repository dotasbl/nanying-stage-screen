import assert from "node:assert/strict";
import test from "node:test";

import {
  AUDIO_DETECTION_OPTIONS,
  applyAudioDetectionPreset,
  createFrequencyBarPlan,
  mapFrequencyDataToBars,
  smoothEnergyValue,
} from "./audioVisualizer.js";

test("audio detection presets configure analyser core parameters", () => {
  const analyser = {};
  const dynamic = AUDIO_DETECTION_OPTIONS.find(
    (option) => option.id === "dynamic",
  );

  applyAudioDetectionPreset(analyser, dynamic);

  assert.equal(analyser.fftSize, 1024);
  assert.equal(analyser.minDecibels, -75);
  assert.equal(analyser.maxDecibels, -18);
  assert.equal(analyser.smoothingTimeConstant, 0.45);
});

test("frequency bars stay quiet below the noise floor", () => {
  const classic = AUDIO_DETECTION_OPTIONS.find(
    (option) => option.id === "classic",
  );
  const frequencyData = new Uint8Array(1024).fill(8);

  const result = mapFrequencyDataToBars(frequencyData, {
    barCount: 24,
    fftSize: classic.fftSize,
    sampleRate: 48000,
    preset: classic,
  });

  assert.equal(result.bars.length, 24);
  assert.ok(result.bars.every((value) => value === 0));
  assert.equal(result.bassEnergy, 0);
  assert.equal(result.titleEnergy, 0);
});

test("frequency bars distribute low, mid, and high frequency energy", () => {
  const dynamic = AUDIO_DETECTION_OPTIONS.find(
    (option) => option.id === "dynamic",
  );
  const frequencyData = new Uint8Array(512);
  frequencyData[3] = 180; // roughly 140Hz at 48kHz / 1024
  frequencyData[30] = 130; // roughly 1.4kHz
  frequencyData[150] = 110; // roughly 7kHz

  const result = mapFrequencyDataToBars(frequencyData, {
    barCount: 20,
    fftSize: dynamic.fftSize,
    sampleRate: 48000,
    preset: dynamic,
  });

  assert.equal(result.bars.length, 20);
  assert.ok(result.bars.some((value) => value > 0.35));
  assert.ok(result.bassEnergy > 0.5);
  assert.ok(result.titleEnergy > 0.25);
  assert.ok(result.overallEnergy > 0.1);
});

test("frequency bar plans can be reused without changing bar output", () => {
  const dynamic = AUDIO_DETECTION_OPTIONS.find(
    (option) => option.id === "dynamic",
  );
  const frequencyData = new Uint8Array(512);
  frequencyData[4] = 172;
  frequencyData[36] = 144;
  frequencyData[180] = 96;

  const uncached = mapFrequencyDataToBars(frequencyData, {
    barCount: 32,
    fftSize: dynamic.fftSize,
    sampleRate: 48000,
    preset: dynamic,
  });
  const cached = mapFrequencyDataToBars(frequencyData, {
    barPlan: createFrequencyBarPlan({
      barCount: 32,
      fftSize: dynamic.fftSize,
      sampleRate: 48000,
    }),
    preset: dynamic,
  });

  assert.deepEqual(cached.bars, uncached.bars);
  assert.equal(cached.bassEnergy, uncached.bassEnergy);
  assert.equal(cached.titleEnergy, uncached.titleEnergy);
});

test("frequency bars can reuse an output buffer", () => {
  const classic = AUDIO_DETECTION_OPTIONS.find(
    (option) => option.id === "classic",
  );
  const frequencyData = new Uint8Array(1024);
  frequencyData[8] = 150;
  const outputBars = new Float32Array(16);

  const result = mapFrequencyDataToBars(frequencyData, {
    barPlan: createFrequencyBarPlan({
      barCount: 16,
      fftSize: classic.fftSize,
      sampleRate: 48000,
    }),
    outputBars,
    preset: classic,
  });

  assert.equal(result.bars, outputBars);
  assert.equal(result.bars.length, 16);
  assert.ok(outputBars.some((value) => value > 0));
});

test("energy smoothing dampens sudden title glow changes", () => {
  const rising = smoothEnergyValue(0.2, 1, {
    attack: 0.25,
    release: 0.1,
    max: 0.72,
  });
  const falling = smoothEnergyValue(0.72, 0, {
    attack: 0.25,
    release: 0.1,
    max: 0.72,
  });

  assert.equal(rising, 0.33);
  assert.equal(falling, 0.648);
});
