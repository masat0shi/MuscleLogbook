'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const PRESETS = [60, 90, 120, 180];

// 無音ループ音声（50ms・8bit WAV）。iOSはバックグラウンドでも
// 再生中のaudio要素があると実行が継続されやすいため、タイマー稼働中は
// これを再生し続けておく（完全なバックグラウンド再生は保証されない）。
const SILENT_LOOP_DATA_URI =
  'data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA';

type SoundType = 'beep' | 'chime' | 'alarm';

const SOUNDS: { type: SoundType; label: string }[] = [
  { type: 'beep', label: 'ビープ' },
  { type: 'chime', label: 'チャイム' },
  { type: 'alarm', label: 'アラーム' },
];

function playSound(ctx: AudioContext, type: SoundType) {
  const note = (
    freq: number,
    start: number,
    duration: number,
    volume = 0.8,
    waveType: OscillatorType = 'sine',
  ) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = waveType;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.01);
    gain.gain.setValueAtTime(volume, ctx.currentTime + start + duration * 0.7);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + duration);
  };

  if (type === 'beep') {
    note(880, 0, 0.12, 1.0, 'square');
    note(880, 0.18, 0.12, 1.0, 'square');
    note(880, 0.36, 0.12, 1.0, 'square');
    note(1320, 0.6, 0.5, 0.8, 'square');
  } else if (type === 'chime') {
    note(523, 0, 0.6, 0.7);
    note(659, 0.25, 0.6, 0.7);
    note(784, 0.5, 0.9, 0.8);
    note(1046, 0.5, 0.9, 0.3);
  } else if (type === 'alarm') {
    for (let i = 0; i < 3; i++) {
      note(660, i * 0.5, 0.35, 0.6);
      note(550, i * 0.5 + 0.25, 0.2, 0.5);
    }
  }
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function RestTimer() {
  const [isOpen, setIsOpen] = useState(false);
  const [duration, setDuration] = useState(90);
  const [remaining, setRemaining] = useState(90);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [sound, setSound] = useState<SoundType>('beep');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const keepAliveAudioRef = useRef<HTMLAudioElement | null>(null);
  const endTimeRef = useRef<number | null>(null); // タイマー終了予定時刻（壁時計、ms）
  const soundRef = useRef(sound);
  soundRef.current = sound;

  // iOSはユーザー操作時にAudioContextを作成・resumeしておく必要がある
  const ensureAudioCtx = useCallback(() => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
      } else if (audioCtxRef.current.state === 'suspended') {
        audioCtxRef.current.resume();
      }
    } catch {
      // AudioContext not available
    }
  }, []);

  // バックグラウンドでも実行が継続されやすくなるよう、無音ループ再生を確保する
  const ensureKeepAliveAudio = useCallback(() => {
    if (!keepAliveAudioRef.current) {
      const audio = new Audio(SILENT_LOOP_DATA_URI);
      audio.loop = true;
      audio.setAttribute('playsinline', 'true');
      keepAliveAudioRef.current = audio;
    }
    return keepAliveAudioRef.current;
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    keepAliveAudioRef.current?.pause();
    setRunning(false);
  }, []);

  const reset = useCallback((sec: number) => {
    stop();
    endTimeRef.current = null;
    setRemaining(sec);
    setFinished(false);
  }, [stop]);

  const start = useCallback(() => {
    if (remaining <= 0) return;
    ensureAudioCtx();
    ensureKeepAliveAudio().play().catch(() => {});
    endTimeRef.current = Date.now() + remaining * 1000;
    setFinished(false);
    setRunning(true);
  }, [remaining, ensureAudioCtx, ensureKeepAliveAudio]);

  // 壁時計基準で残り時間を再計算する（setIntervalがバックグラウンドで
  // 間引かれても、復帰時に正しい残り時間・終了判定ができるようにする）
  const tick = useCallback(() => {
    if (endTimeRef.current === null) return;
    const secLeft = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
    setRemaining(secLeft);
    if (secLeft <= 0) {
      stop();
      setFinished(true);
      const ctx = audioCtxRef.current;
      if (ctx) {
        ctx.resume().then(() => playSound(ctx, soundRef.current));
      }
    }
  }, [stop]);

  useEffect(() => {
    if (!running) return;
    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, tick]);

  // 画面に戻ってきた瞬間に残り時間・終了判定を即座に補正する
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && running) {
        tick();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [running, tick]);

  const handlePreset = (sec: number) => {
    setDuration(sec);
    reset(sec);
  };

  const handleToggle = () => {
    if (running) {
      stop();
    } else {
      if (remaining === 0) reset(duration);
      else start();
    }
  };

  const progress = remaining / duration;
  const circumference = 2 * Math.PI * 20;
  const strokeDashoffset = circumference * (1 - progress);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="bottom-above-nav fixed right-6 z-40 md:bottom-6 w-14 h-14 rounded-full bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center text-2xl"
        aria-label="休憩タイマーを開く"
      >
        ⌛
</button>
    );
  }

  return (
    <div className="bottom-above-nav fixed right-4 z-40 md:bottom-4 md:right-4 pointer-events-none" style={{ width: 'min(320px, calc(100vw - 2rem))' }}>
      <div className="pointer-events-auto w-full bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-indigo-600 text-white">
          <span className="font-semibold text-sm">⏱ 休憩タイマー</span>
          <button
            onClick={() => { stop(); setIsOpen(false); }}
            className="text-white/80 hover:text-white text-xl leading-none"
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        <div className="px-4 py-3 flex items-center gap-4">
          {/* Circular progress */}
          <div className="relative flex-shrink-0 w-16 h-16">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 48 48">
              <circle cx="24" cy="24" r="20" fill="none" stroke="#e5e7eb" strokeWidth="4" />
              <circle
                cx="24" cy="24" r="20" fill="none"
                stroke={finished ? '#ef4444' : '#6366f1'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <span className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${finished ? 'text-red-500' : 'text-gray-800 dark:text-white'}`}>
              {finished ? 'GO!' : formatTime(remaining)}
            </span>
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-2">
            {/* Presets */}
            <div className="flex gap-1">
              {PRESETS.map((sec) => (
                <button
                  key={sec}
                  onClick={() => handlePreset(sec)}
                  className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${
                    duration === sec && !running
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Start / Pause / Reset */}
            <div className="flex gap-2">
              <button
                onClick={handleToggle}
                className={`flex-1 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors ${
                  running ? 'bg-yellow-500 hover:bg-yellow-600' : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {running ? '一時停止' : remaining === 0 ? 'リセット' : 'スタート'}
              </button>
              <button
                onClick={() => reset(duration)}
                className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                aria-label="リセット"
              >
                ↺
              </button>
            </div>

            {/* Sound selector */}
            <div className="flex gap-1">
              {SOUNDS.map(({ type, label }) => (
                <button
                  key={type}
                  onClick={() => { ensureAudioCtx(); setSound(type); const ctx = audioCtxRef.current; if (ctx) ctx.resume().then(() => playSound(ctx, type)); }}
                  className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${
                    sound === type
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
