import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, Music } from 'lucide-react';
import { useLibraryStore } from '../../store/libraryStore.js';

export const DropZoneOverlay: React.FC = () => {
  const { refreshAll } = useLibraryStore();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [importedToast, setImportedToast] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    let dragCounter = 0;

    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter++;
      if (e.dataTransfer?.types?.includes('Files')) {
        setIsDraggingOver(true);
      }
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        setIsDraggingOver(false);
      }
    };

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter = 0;
      setIsDraggingOver(false);

      const files = e.dataTransfer?.files;
      if (!files || files.length === 0 || !window.api) return;

      // Extract native file paths
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const filePath = window.api.getPathForFile(file);
        if (filePath) {
          paths.push(filePath);
        }
      }

      if (paths.length > 0) {
        setIsImporting(true);
        try {
          const result = await window.api.importPaths(paths);
          await refreshAll();
          if (result && result.importedCount > 0) {
            setImportedToast(result.importedCount);
            setTimeout(() => setImportedToast(null), 3500);
          }
        } catch (err) {
          console.error('Drag drop import error:', err);
        } finally {
          setIsImporting(false);
        }
      }
    };

    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  return (
    <>
      {/* Visual Drag Over Indicator */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 pointer-events-none animate-in fade-in duration-150 border-4 border-dashed border-emerald-500 rounded-xl m-2">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 mb-4 animate-bounce">
            <UploadCloud className="w-10 h-10" />
          </div>
          <h2 className="text-xl font-extrabold text-white mb-1">
            Drop Media Files or Folders Here
          </h2>
          <p className="text-xs text-neutral-300">
            Audio and video tracks will be automatically scanned and indexed to your library
          </p>
        </div>
      )}

      {/* Import Toast Notification */}
      {importedToast !== null && (
        <div className="fixed bottom-24 right-6 z-50 bg-emerald-950 border border-emerald-500 text-white px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <div>
            <div className="text-xs font-bold text-white">Import Complete</div>
            <div className="text-[11px] text-emerald-200">
              Added/updated {importedToast} track(s) in your library
            </div>
          </div>
        </div>
      )}
    </>
  );
};
