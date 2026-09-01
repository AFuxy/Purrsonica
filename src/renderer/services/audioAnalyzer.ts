import { Essentia, EssentiaWASM } from 'essentia.js';
import { parseKey } from '../../shared/camelot.js';
import { Track } from '../../shared/types.js';

let essentiaPromise: Promise<any> | null = null;
let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    sharedAudioCtx = new AudioCtx();
  }
  return sharedAudioCtx;
}

/**
 * Extracts the real underlying WASM Module from various bundler / ESM interop wrapper shapes
 */
function extractWasmModule(raw: any): any {
  if (!raw) return null;
  if (typeof raw.EssentiaJS === 'function') return raw;
  if (raw.EssentiaWASM && typeof raw.EssentiaWASM.EssentiaJS === 'function') return raw.EssentiaWASM;
  if (raw.default && typeof raw.default.EssentiaJS === 'function') return raw.default;
  if (raw.default?.EssentiaWASM && typeof raw.default.EssentiaWASM.EssentiaJS === 'function') return raw.default.EssentiaWASM;
  if (typeof raw === 'function') return raw;
  return raw.EssentiaWASM || raw.default || raw;
}

export function getEssentia(): Promise<any> {
  if (essentiaPromise) return essentiaPromise;

  essentiaPromise = new Promise(async (resolve, reject) => {
    try {
      const rawModule: any = EssentiaWASM;
      let wasmModule = extractWasmModule(rawModule);

      // 1. If EssentiaWASM is a factory function
      if (typeof wasmModule === 'function') {
        const instantiated = await wasmModule();
        wasmModule = extractWasmModule(instantiated) || instantiated;
      }

      // 2. If already initialized with EssentiaJS constructor
      if (wasmModule && typeof wasmModule.EssentiaJS === 'function') {
        const EssentiaConstructor = (Essentia as any).default || Essentia;
        resolve(new EssentiaConstructor(wasmModule));
        return;
      }

      // 3. If wasmModule is a thenable (Promise)
      if (wasmModule && typeof wasmModule.then === 'function') {
        const mod = await wasmModule;
        const unwrapped = extractWasmModule(mod) || mod;
        const EssentiaConstructor = (Essentia as any).default || Essentia;
        resolve(new EssentiaConstructor(unwrapped));
        return;
      }

      // 4. Wait for Emscripten onRuntimeInitialized hook
      let resolved = false;
      const targetObj = wasmModule || rawModule;
      const prevInit = targetObj?.onRuntimeInitialized;
      if (targetObj) {
        targetObj.onRuntimeInitialized = () => {
          if (typeof prevInit === 'function') prevInit();
          if (!resolved) {
            resolved = true;
            const finalWasm = extractWasmModule(targetObj) || targetObj;
            const EssentiaConstructor = (Essentia as any).default || Essentia;
            resolve(new EssentiaConstructor(finalWasm));
          }
        };
      }

      // 5. Poll until EssentiaJS constructor is attached
      const startTime = Date.now();
      const interval = setInterval(() => {
        const liveWasm = extractWasmModule(targetObj) || targetObj;
        if (liveWasm && typeof liveWasm.EssentiaJS === 'function') {
          clearInterval(interval);
          if (!resolved) {
            resolved = true;
            const EssentiaConstructor = (Essentia as any).default || Essentia;
            resolve(new EssentiaConstructor(liveWasm));
          }
        } else if (Date.now() - startTime > 10000) {
          clearInterval(interval);
          if (!resolved) {
            reject(new Error('Essentia WASM initialization timed out'));
          }
        }
      }, 30);
    } catch (err) {
      reject(err);
    }
  });

  return essentiaPromise;
}

export interface AudioAnalysisResult {
  bpm: number;
  musical_key: string;
  camelot_key: string;
  key_confidence?: number;
  bpm_confidence?: number;
}

/**
 * Decodes audio from an audio URL or file path and analyzes BPM and Camelot Key using WebAssembly DSP.
 * Strictly ignores non-audio tracks (media_type === 'video').
 */
export async function analyzeAudioTrack(track: Track): Promise<AudioAnalysisResult | null> {
  if (track.media_type !== 'audio') {
    throw new Error('Only audio tracks can be analyzed for BPM and Key.');
  }

  // Resolve audio URL
  const trackUrl = window.api?.getMediaUrl
    ? window.api.getMediaUrl(track.file_path)
    : `media://app/stream?path=${encodeURIComponent(track.file_path)}`;

  const response = await fetch(trackUrl);
  if (!response.ok) {
    throw new Error(`Failed to read audio file: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  // Decode with shared Web Audio API context
  const audioCtx = getSharedAudioContext();
  if (audioCtx.state === 'suspended') {
    await audioCtx.resume().catch(() => {});
  }

  const audioBuffer: AudioBuffer = await new Promise((resolve, reject) => {
    // decodeAudioData detaches the arrayBuffer, so we pass a slice
    audioCtx.decodeAudioData(arrayBuffer.slice(0), resolve, reject);
  });

  // Resample & window sampling:
  // We extract a generous 120-150s continuous window (or the full song if under 150s)
  // starting past intro silence/buildup, and resample strictly to 44,100 Hz mono
  // via OfflineAudioContext for rock-solid tempo grid & pitch calculations.
  const targetSampleRate = 44100;
  const duration = audioBuffer.duration;

  let startSec = 0;
  let windowDuration = duration;

  if (duration > 150) {
    windowDuration = Math.min(150, duration * 0.85);
    // Skip intro fade-in / silent leader
    startSec = Math.min(12, (duration - windowDuration) * 0.2);
  } else if (duration > 30) {
    startSec = Math.min(5, duration * 0.05);
    windowDuration = duration - startSec;
  }

  const targetSamples = Math.max(1, Math.floor(windowDuration * targetSampleRate));
  const offlineCtx = new OfflineAudioContext(1, targetSamples, targetSampleRate);

  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(offlineCtx.destination);
  source.start(0, startSec, windowDuration);

  const renderedBuffer = await offlineCtx.startRendering();
  const monoSignal = renderedBuffer.getChannelData(0);

  // Await Essentia WASM initialization
  const essentia = await getEssentia();
  const vectorSignal = essentia.arrayToVector(monoSignal);

  try {
    // 1. High-Resolution Harmonic Key Extraction (EDMA / DJ Mixing Profile)
    // Parameters:
    // averageDetuningCorrection: true (auto-detects and corrects 432Hz/analog detuning up to 50 cents)
    // frameSize: 4096, hopSize: 4096
    // hpcpSize: 36 (3x higher resolution chromagram: 3 bins per semitone)
    // maxFrequency: 3500 (filters out high cymbal / noise sweeps)
    // maximumSpectralPeaks: 60
    // minFrequency: 25 (captures sub-bass fundamental roots)
    // pcpThreshold: 0.2
    // profileType: 'edma' (Electronic Dance Music / DJ Harmonic Mixing Profile)
    // sampleRate: 44100 (matching exact OfflineAudioContext rendered rate)
    const keyRes = essentia.KeyExtractor(
      vectorSignal,
      true,   // averageDetuningCorrection
      4096,   // frameSize
      4096,   // hopSize
      36,     // hpcpSize (tri-semitone resolution)
      3500,   // maxFrequency
      60,     // maximumSpectralPeaks
      25,     // minFrequency
      0.2,    // pcpThreshold
      'edma', // profileType: Electronic Dance Music / Modern DJ Profile
      targetSampleRate // 44100
    );

    const rawKey = keyRes?.key ? `${keyRes.key} ${keyRes.scale || ''}`.trim() : '';
    const parsedKey = parseKey(rawKey);

    // 2. Rhythm / BPM Extraction on calibrated 44.1 kHz signal
    const rhythmRes = essentia.RhythmExtractor2013(vectorSignal, 215, 'multifeature', 50);
    const rawBpm = typeof rhythmRes?.bpm === 'number' ? rhythmRes.bpm : 0;
    const roundedBpm = Math.round(rawBpm * 10) / 10;

    const finalMusicalKey = parsedKey?.musicalKey || (rawKey ? rawKey.toUpperCase() : '');
    const finalCamelotKey = parsedKey?.camelot || '';

    return {
      bpm: roundedBpm,
      musical_key: finalMusicalKey,
      camelot_key: finalCamelotKey,
      key_confidence: keyRes?.strength,
      bpm_confidence: rhythmRes?.confidence,
    };
  } finally {
    if (vectorSignal && typeof vectorSignal.delete === 'function') {
      vectorSignal.delete();
    }
  }
}
