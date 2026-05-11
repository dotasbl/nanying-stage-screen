export const AUDIO_FREQUENCY_RANGES = [
  { id: "bass", minHz: 60, maxHz: 250, ratio: 0.2, weight: 1.08 },
  { id: "mid", minHz: 250, maxHz: 4000, ratio: 0.45, weight: 1 },
  { id: "high", minHz: 4000, maxHz: 12000, ratio: 0.35, weight: 0.9 },
];

export const AUDIO_DETECTION_OPTIONS = [
  {
    id: "dynamic",
    name: "動感",
    shortName: "動",
    fftSize: 1024,
    minDecibels: -75,
    maxDecibels: -18,
    smoothingTimeConstant: 0.45,
    sensitivity: 1.45,
    noiseFloor: 6,
    attackSmoothing: 0.72,
    releaseDecay: 0.84,
    visualExponent: 0.78,
  },
  {
    id: "classic",
    name: "經典",
    shortName: "經",
    fftSize: 2048,
    minDecibels: -90,
    maxDecibels: -22,
    smoothingTimeConstant: 0.75,
    sensitivity: 1.2,
    noiseFloor: 10,
    attackSmoothing: 0.62,
    releaseDecay: 0.92,
    visualExponent: 0.86,
  },
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const allocateRangeCounts = (barCount) => {
  const safeBarCount = Math.max(1, Math.round(Number(barCount) || 1));
  if (safeBarCount < AUDIO_FREQUENCY_RANGES.length) {
    return AUDIO_FREQUENCY_RANGES.slice(0, safeBarCount).map((range) => ({
      ...range,
      count: 1,
    }));
  }

  const allocations = AUDIO_FREQUENCY_RANGES.map((range) => {
    const exact = range.ratio * safeBarCount;
    return {
      ...range,
      count: Math.max(1, Math.floor(exact)),
      remainder: exact - Math.floor(exact),
    };
  });
  let assigned = allocations.reduce((sum, range) => sum + range.count, 0);

  while (assigned < safeBarCount) {
    const next = allocations.reduce((bestIndex, range, index) => {
      if (bestIndex === -1) {
        return index;
      }
      return range.remainder > allocations[bestIndex].remainder
        ? index
        : bestIndex;
    }, -1);
    allocations[next].count += 1;
    allocations[next].remainder = 0;
    assigned += 1;
  }

  while (assigned > safeBarCount) {
    const next = allocations.reduce((bestIndex, range, index) => {
      if (range.count <= 1) {
        return bestIndex;
      }
      if (bestIndex === -1) {
        return index;
      }
      return range.count > allocations[bestIndex].count ? index : bestIndex;
    }, -1);
    if (next === -1) {
      break;
    }
    allocations[next].count -= 1;
    assigned -= 1;
  }

  return allocations;
};

const hzToBin = (hz, sampleRate, fftSize, binCount) => {
  const hzPerBin = sampleRate / fftSize;
  return clamp(Math.round(hz / hzPerBin), 0, Math.max(0, binCount - 1));
};

const readFrequencySegment = (frequencyData, startBin, endBin) => {
  const safeStart = clamp(startBin, 0, Math.max(0, frequencyData.length - 1));
  const safeEnd = clamp(endBin, safeStart + 1, frequencyData.length);
  let sum = 0;
  let peak = 0;
  let count = 0;

  for (let index = safeStart; index < safeEnd; index += 1) {
    const value = frequencyData[index] || 0;
    sum += value;
    peak = Math.max(peak, value);
    count += 1;
  }

  if (count === 0) {
    return 0;
  }

  return peak * 0.68 + (sum / count) * 0.32;
};

const normalizeFrequencyValue = (value, preset, weight = 1) => {
  const cleaned = Math.max(0, value - preset.noiseFloor);
  if (cleaned === 0) {
    return 0;
  }

  const availableRange = Math.max(1, 255 - preset.noiseFloor);
  const scaled = clamp(
    (cleaned / availableRange) * preset.sensitivity * weight,
    0,
    1,
  );
  return Math.pow(scaled, preset.visualExponent);
};

const createFrequencySegment = (range, context) => {
  const minHz = clamp(range.minHz, 1, context.nyquist);
  const maxHz = clamp(range.maxHz, minHz + 1, context.nyquist);
  return {
    startBin: hzToBin(
      minHz,
      context.sampleRate,
      context.fftSize,
      context.binCount,
    ),
    endBin:
      hzToBin(maxHz, context.sampleRate, context.fftSize, context.binCount) + 1,
    weight: range.weight,
  };
};

const segmentEnergy = (frequencyData, segment, preset) => {
  const value = readFrequencySegment(
    frequencyData,
    segment.startBin,
    segment.endBin,
  );
  return normalizeFrequencyValue(value, preset, segment.weight);
};

export const applyAudioDetectionPreset = (analyser, preset) => {
  if (!analyser || !preset) {
    return;
  }

  analyser.fftSize = preset.fftSize;
  analyser.minDecibels = preset.minDecibels;
  analyser.maxDecibels = preset.maxDecibels;
  analyser.smoothingTimeConstant = preset.smoothingTimeConstant;
};

export const createFrequencyBarPlan = ({ barCount, fftSize, sampleRate }) => {
  const safeBarCount = Math.max(1, Math.round(Number(barCount) || 1));
  const safeFftSize = Math.max(32, Number(fftSize) || 1024);
  const safeSampleRate = Math.max(8000, Number(sampleRate) || 48000);
  const binCount = Math.max(1, safeFftSize / 2);
  const nyquist = safeSampleRate / 2;
  const context = {
    binCount,
    fftSize: safeFftSize,
    nyquist,
    sampleRate: safeSampleRate,
  };
  const barSegments = [];

  allocateRangeCounts(safeBarCount).forEach((range) => {
    const minHz = clamp(range.minHz, 1, nyquist);
    const maxHz = clamp(range.maxHz, minHz + 1, nyquist);
    const logMin = Math.log(minHz);
    const logMax = Math.log(maxHz);

    for (let index = 0; index < range.count; index += 1) {
      const startHz = Math.exp(
        logMin + ((logMax - logMin) * index) / range.count,
      );
      const endHz = Math.exp(
        logMin + ((logMax - logMin) * (index + 1)) / range.count,
      );
      barSegments.push(
        createFrequencySegment(
          {
            minHz: startHz,
            maxHz: endHz,
            weight: range.weight,
          },
          context,
        ),
      );
    }
  });

  return {
    barCount: barSegments.length,
    barSegments,
    bassSegment: createFrequencySegment(AUDIO_FREQUENCY_RANGES[0], context),
    fftSize: safeFftSize,
    sampleRate: safeSampleRate,
    titleSegment: createFrequencySegment(
      {
        minHz: AUDIO_FREQUENCY_RANGES[1].minHz,
        maxHz: AUDIO_FREQUENCY_RANGES[2].maxHz,
        weight: 1,
      },
      context,
    ),
  };
};

export const mapFrequencyDataToBars = (
  frequencyData,
  { barCount, barPlan, fftSize, outputBars, sampleRate, preset },
) => {
  const activePreset = preset || AUDIO_DETECTION_OPTIONS[0];
  const activePlan =
    barPlan ||
    createFrequencyBarPlan({
      barCount,
      fftSize: fftSize || activePreset.fftSize,
      sampleRate,
    });
  const bars = outputBars || new Array(activePlan.barCount);
  let total = 0;

  activePlan.barSegments.forEach((segment, index) => {
    const value = segmentEnergy(frequencyData, segment, activePreset);
    bars[index] = value;
    total += value;
  });

  const bassEnergy = segmentEnergy(
    frequencyData,
    activePlan.bassSegment,
    activePreset,
  );
  const titleEnergy = segmentEnergy(
    frequencyData,
    activePlan.titleSegment,
    activePreset,
  );
  const overallEnergy =
    activePlan.barCount > 0 ? clamp(total / activePlan.barCount, 0, 1) : 0;

  return {
    bars,
    bassEnergy,
    overallEnergy,
    titleEnergy,
  };
};
