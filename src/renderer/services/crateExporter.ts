import { Track } from '../../shared/types.js';

/**
 * Exports a track collection or playlist as an extended DJ crate (.m3u8) file.
 * Compatible with Pioneer Rekordbox, Serato DJ Pro, Engine DJ (Denon),
 * Traktor, VirtualDJ, and standalone USB flash drives.
 */
export function exportDjCrateM3U8(
  crateTitle: string,
  tracks: Track[]
): { success: boolean; filename: string } {
  if (!tracks || tracks.length === 0) {
    return { success: false, filename: '' };
  }

  const cleanName =
    crateTitle
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\s+/g, ' ')
      .trim() || 'Purrsonica_DJ_Crate';

  const filename = `${cleanName}.m3u8`;

  const lines: string[] = [
    '#EXTM3U',
    `#PLAYLIST:Purrsonica DJ Crate - ${crateTitle}`,
    `#EXT-X-PURRSONICA-CRATE:${cleanName}`,
  ];

  tracks.forEach((track) => {
    const durationSec = Math.round(track.duration || 0);
    const artist = (track.artist || 'Unknown Artist').trim();
    const title = (track.title || track.file_name || 'Untitled').trim();
    const bpm = track.bpm ? Math.round(Number(track.bpm)) : '';
    const key = (track.camelot_key || track.musical_key || '').trim();

    // Standard Extended M3U Directive
    lines.push(`#EXTINF:${durationSec},${artist} - ${title}`);

    // DJ Metadata Directives (Camelot Key, BPM, and Rekordbox / Serato compatible comment)
    if (bpm) lines.push(`#EXT-X-PURRSONICA-BPM:${bpm}`);
    if (key) lines.push(`#EXT-X-PURRSONICA-KEY:${key}`);
    lines.push(
      `#EXT-X-COMMENT:Key: ${key || 'Unknown'} | BPM: ${bpm || 'Unknown'} | Purrsonica DJ Crate`
    );

    // Absolute file path
    lines.push(track.file_path);
  });

  const content = lines.join('\r\n') + '\r\n';
  const blob = new Blob([content], { type: 'audio/x-mpegurl;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return { success: true, filename };
}
