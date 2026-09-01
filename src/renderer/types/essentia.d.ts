declare module 'essentia.js' {
  export const EssentiaWASM: any;
  export class Essentia {
    constructor(wasmModule: any);
    version: string;
    arrayToVector(arr: Float32Array): any;
    vectorToArray(vec: any): Float32Array;
    KeyExtractor(signal: any): { key: string; scale: string; strength: number };
    RhythmExtractor2013(signal: any): { bpm: number; ticks: any; confidence: number; estimates: any };
    [key: string]: any;
  }
}
