import fs from 'node:fs';
import { getDB } from '../db/database.js';
import { extractWaveformPeaks } from './waveform.js';

export async function recacheAllWaveforms(
  onProgress?: (current: number, total: number) => void
): Promise<{ generatedCount: number; total: number }> {
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

  const updateStmt = db.prepare('UPDATE tracks SET waveform_data = ? WHERE id = ?');

  for (let i = 0; i < total; i++) {
    const row = rows[i];
    if (!fs.existsSync(row.file_path)) continue;

    try {
      const peaks = await extractWaveformPeaks(row.file_path, 128);
      if (peaks && peaks.length > 0) {
        updateStmt.run(JSON.stringify(peaks), row.id);
        generatedCount++;
      }
    } catch {}

    if (onProgress && (i % 15 === 0 || i === total - 1)) {
      onProgress(i + 1, total);
    }
  }

  return { generatedCount, total };
}
