import fs from 'node:fs';

/**
 * Fast waveform peak extraction from audio file.
 * Samples chunks across the file to compute RMS/peak energy envelope.
 */
export async function extractWaveformPeaks(
  filePath: string,
  barsCount: number = 128
): Promise<number[]> {
  try {
    const stats = await fs.promises.stat(filePath);
    const fileSize = stats.size;
    if (fileSize === 0) return generateFallbackPeaks(barsCount);

    const fd = await fs.promises.open(filePath, 'r');
    const chunkSize = 1024;
    const buffer = Buffer.alloc(chunkSize);
    const peaks: number[] = [];

    // Sample evenly across the file
    const step = Math.max(1, Math.floor((fileSize - chunkSize) / barsCount));

    for (let i = 0; i < barsCount; i++) {
      const position = Math.min(i * step, Math.max(0, fileSize - chunkSize));
      const { bytesRead } = await fd.read(buffer, 0, chunkSize, position);

      if (bytesRead <= 0) {
        peaks.push(0.1);
        continue;
      }

      // Calculate peak amplitude in this chunk (16-bit PCM / audio byte variance)
      let sum = 0;
      for (let b = 0; b < bytesRead - 1; b += 2) {
        const val = buffer.readInt16LE(b) / 32768.0;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / (bytesRead / 2));
      // Normalize to 0.05 - 1.0 with subtle dynamic curve
      const normalized = Math.min(1.0, Math.max(0.08, rms * 2.2));
      peaks.push(Number(normalized.toFixed(3)));
    }

    await fd.close();

    // Smooth peaks slightly for aesthetic display
    return smoothPeaks(peaks);
  } catch (err) {
    return generateFallbackPeaks(barsCount);
  }
}

function smoothPeaks(peaks: number[]): number[] {
  const smoothed: number[] = [];
  for (let i = 0; i < peaks.length; i++) {
    const prev = peaks[i - 1] ?? peaks[i];
    const curr = peaks[i];
    const next = peaks[i + 1] ?? peaks[i];
    const avg = (prev * 0.25 + curr * 0.5 + next * 0.25);
    smoothed.push(Number(avg.toFixed(3)));
  }
  return smoothed;
}

function generateFallbackPeaks(count: number): number[] {
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const base = 0.2 + 0.6 * Math.abs(Math.sin((i / count) * Math.PI * 3));
    peaks.push(Number(base.toFixed(3)));
  }
  return peaks;
}
