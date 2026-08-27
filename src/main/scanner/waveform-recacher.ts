import fs from 'node:fs';
import { getDB } from '../db/database.js';
import { extractWaveformPeaks } from './waveform.js';

let isWaveformsCancelled = false;

export function cancelWaveformsRecache(): void {
  isWaveformsCancelled = true;
}

export async function recacheAllWaveforms(
  onProgress?: (current: number, total: number, status?: 'running' | 'completed' | 'cancelled') => void,
  force: boolean = false
): Promise<{ generatedCount: number; alreadyCachedCount: number; total: number; cancelled: boolean }> {
  isWaveformsCancelled = false;
  const db = getDB();

  const rows = db
    .prepare("SELECT id, file_path, waveform_data FROM tracks WHERE media_type = 'audio'")
    .all() as Array<{
    id: string;
    file_path: string;
    waveform_data: string | null;
  }>;

  const total = rows.length;
  let generatedCount = 0;
  let alreadyCachedCount = 0;

  const updateStmt = db.prepare('UPDATE tracks SET waveform_data = ? WHERE id = ?');

  for (let i = 0; i < total; i++) {
    if (isWaveformsCancelled) {
      if (onProgress) onProgress(i, total, 'cancelled');
      return { generatedCount, alreadyCachedCount, total, cancelled: true };
    }

    const row = rows[i];

    // Smart Resume: If the track already has waveform data, skip re-computation
    if (!force && row.waveform_data && row.waveform_data.length > 10) {
      alreadyCachedCount++;
      if (onProgress && (i % 20 === 0 || i === total - 1)) {
        onProgress(i + 1, total, 'running');
      }
      continue;
    }

    if (!fs.existsSync(row.file_path)) continue;

    try {
      const peaks = await extractWaveformPeaks(row.file_path, 128);
      if (peaks && peaks.length > 0) {
        updateStmt.run(JSON.stringify(peaks), row.id);
        generatedCount++;
      }
    } catch {}

    if (onProgress && (i % 10 === 0 || i === total - 1)) {
      onProgress(i + 1, total, 'running');
    }
  }

  if (onProgress) onProgress(total, total, 'completed');
  return { generatedCount, alreadyCachedCount, total, cancelled: false };
}
