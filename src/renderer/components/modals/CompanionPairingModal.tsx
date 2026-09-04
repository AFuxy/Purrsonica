import React, { useEffect, useState } from 'react';
import { Smartphone, RefreshCw, X, CheckCircle, Wifi, ShieldCheck, Clock } from 'lucide-react';
import { CompanionPairingSession } from '../../../shared/types.js';

interface CompanionPairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CompanionPairingModal: React.FC<CompanionPairingModalProps> = ({ isOpen, onClose }) => {
  const [session, setSession] = useState<CompanionPairingSession | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [pairedDevice, setPairedDevice] = useState<any | null>(null);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(300);

  // Fetch or generate pairing session
  const loadPairingSession = async () => {
    if (!window.api?.createCompanionPairingSession) return;
    setIsLoading(true);
    setPairedDevice(null);
    try {
      const newSession = await window.api.createCompanionPairingSession();
      setSession(newSession);
      const remaining = Math.max(0, Math.floor((newSession.expiresAt - Date.now()) / 1000));
      setSecondsRemaining(remaining);
    } catch (err) {
      console.error('Failed to create pairing session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setSession(null);
      setPairedDevice(null);
      return;
    }

    loadPairingSession();

    // Listen for device pairing success event
    const unsubscribe = window.api?.onCompanionDevicePaired?.((device) => {
      setPairedDevice(device);
    });

    return () => {
      unsubscribe?.();
    };
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || !session || pairedDevice) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session, pairedDevice]);

  if (!isOpen) return null;

  const formatTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = secondsRemaining <= 0;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden p-6 select-none animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-inner">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">Pair Mobile Companion</h2>
              <p className="text-xs text-[var(--text-muted)]">Connect Purrsonica on iOS or Android</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-neutral-400 hover:text-white hover:bg-[var(--bg-tertiary)] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        {pairedDevice ? (
          /* Success State */
          <div className="py-6 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border-2 border-emerald-400/40 text-emerald-400 flex items-center justify-center shadow-[0_0_25px_rgba(16,185,129,0.35)] animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Device Successfully Paired!</h3>
              <p className="text-sm font-semibold text-emerald-300 font-mono">
                {pairedDevice.name || 'Mobile Companion'}
              </p>
              <p className="text-xs text-[var(--text-muted)] max-w-xs pt-1">
                Your phone is now connected. You can stream lossless audio, manage playlists, and control playback remotely.
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-black font-bold text-sm transition-all shadow-lg cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          /* QR Code State */
          <div className="space-y-4">
            {/* QR Container */}
            <div className="relative flex flex-col items-center justify-center p-4 rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-color)]">
              {isLoading || !session ? (
                <div className="w-64 h-64 flex flex-col items-center justify-center gap-2 text-neutral-400">
                  <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                  <span className="text-xs font-mono">Generating secure code...</span>
                </div>
              ) : (
                <div className="relative group">
                  <div className="p-3 bg-white rounded-2xl shadow-xl border border-neutral-200">
                    <img
                      src={session.qrCodeDataUrl}
                      alt="Purrsonica Mobile Pairing QR"
                      className={`w-60 h-60 object-contain transition-opacity duration-200 ${
                        isExpired ? 'opacity-20 filter blur-xs' : 'opacity-100'
                      }`}
                    />
                  </div>

                  {/* Expired Overlay */}
                  {isExpired && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/60 backdrop-blur-xs rounded-2xl p-4 text-center">
                      <span className="text-xs font-bold text-rose-400">Code Expired</span>
                      <button
                        onClick={loadPairingSession}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-xs transition-transform active:scale-95 cursor-pointer shadow-md"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Refresh Code</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Countdown & Status */}
              <div className="w-full flex items-center justify-between mt-3 px-1 text-xs text-[var(--text-muted)] font-mono">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Waiting for scan...</span>
                </div>
                {!isExpired && (
                  <div className="flex items-center gap-1 text-[var(--text-secondary)] font-bold">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{formatTimer(secondsRemaining)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Server Connection Info Pills */}
            {session && (
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[var(--bg-tertiary)]/40 border border-[var(--border-color)] text-[var(--text-secondary)]">
                  <Wifi className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                  <span className="truncate">{session.localIps[0] || '127.0.0.1'}:{session.port}</span>
                </div>
                <div className="flex items-center gap-1.5 p-2 rounded-xl bg-[var(--bg-tertiary)]/40 border border-[var(--border-color)] text-[var(--text-secondary)]">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="truncate">{session.allowOutsideLan ? 'Remote 4G/5G (E2EE)' : 'Local LAN Only (Secure)'}</span>
                </div>
              </div>
            )}

            {/* Step-by-step Onboarding Instructions */}
            <div className="p-3 rounded-2xl bg-[var(--bg-tertiary)]/30 border border-[var(--border-color)] space-y-1.5 text-xs text-[var(--text-muted)]">
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-bold text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  1
                </span>
                <span>Open the <strong>Purrsonica Mobile</strong> app on iOS or Android.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-bold text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  2
                </span>
                <span>Tap <strong>"Pair with Desktop"</strong> and scan this QR code with your camera.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[10px] font-bold text-cyan-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  3
                </span>
                <span>Ensure both your phone and PC are connected to the same home Wi-Fi.</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
