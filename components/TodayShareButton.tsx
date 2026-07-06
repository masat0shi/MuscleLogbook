'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { Workout, CardioLog } from '@/types';

const activityLabel: Record<string, string> = {
  running: 'ランニング',
  walking: 'ウォーキング',
};

function formatDate(dateString: string) {
  const date = new Date(dateString + 'T00:00:00');
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const m = date.getMonth() + 1;
  const d = date.getDate();
  const w = weekdays[date.getDay()];
  return `${m}月${d}日(${w})`;
}

interface ShareCardProps {
  date: string;
  workouts: Workout[];
  cardioLogs: CardioLog[];
}

function ShareCard({ date, workouts, cardioLogs }: ShareCardProps) {
  const grouped = workouts.reduce((acc, w) => {
    const cat = w.exercise?.category ?? '種目';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(w);
    return acc;
  }, {} as Record<string, Workout[]>);

  return (
    <div
      style={{
        width: '360px',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        borderRadius: '16px',
        padding: '28px 24px',
        fontFamily: "'Hiragino Sans', 'Noto Sans JP', sans-serif",
        color: '#f1f5f9',
      }}
    >
      {/* ヘッダー */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '4px' }}>
          💪 MuscleLogbook
        </div>
        <div style={{ fontSize: '22px', fontWeight: '700', color: '#f8fafc' }}>
          {formatDate(date)}
        </div>
      </div>

      <div style={{ height: '1px', background: 'linear-gradient(90deg, #3b82f6, transparent)', marginBottom: '20px' }} />

      {/* 筋トレ */}
      {workouts.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '10px' }}>
            💪 筋トレ
          </div>
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '4px' }}>{cat}</div>
              {items.map((w) => (
                <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{w.exercise?.name}</span>
                  <span style={{ fontSize: '12px', color: '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                    {w.weight}kg × {w.reps}回 × {w.sets}set
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* カーディオ */}
      {cardioLogs.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '11px', color: '#34d399', fontWeight: '600', letterSpacing: '0.1em', marginBottom: '10px' }}>
            🏃 カーディオ
          </div>
          {cardioLogs.map((c) => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: '#e2e8f0' }}>{activityLabel[c.activity_type] ?? c.activity_type}</span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                {[
                  c.distance != null && `${c.distance}km`,
                  c.duration != null && `${c.duration}分`,
                ].filter(Boolean).join(' / ')}
              </span>
            </div>
          ))}
        </div>
      )}

      <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #3b82f6)', marginBottom: '16px' }} />

      {/* フッター */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <div style={{ fontSize: '11px', color: '#475569' }}>
          #{workouts.length + cardioLogs.length} 種目
        </div>
      </div>
    </div>
  );
}

export default function TodayShareButton() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);
  const [empty, setEmpty] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  const handleOpen = async () => {
    setLoading(true);
    setOpen(true);
    setEmpty(false);

    const [{ data: wData }, { data: cData }] = await Promise.all([
      supabase
        .from('workouts')
        .select('*, exercise:exercises(*)')
        .eq('date', today)
        .order('created_at'),
      supabase
        .from('cardio_logs')
        .select('*')
        .eq('date', today)
        .order('created_at'),
    ]);

    const w = wData || [];
    const c = cData || [];
    setWorkouts(w);
    setCardioLogs(c);
    if (w.length === 0 && c.length === 0) setEmpty(true);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `musclelogbook-${today}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-300 dark:border-indigo-600 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        今日の記録を保存
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" onClick={() => setOpen(false)}>
          <div className="flex flex-col items-center gap-4" onClick={(e) => e.stopPropagation()}>
            {loading ? (
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
            ) : empty ? (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">今日の記録はまだありません</p>
                <button onClick={() => setOpen(false)} className="mt-4 text-sm text-blue-500">閉じる</button>
              </div>
            ) : (
              <>
                <div ref={cardRef}>
                  <ShareCard date={today} workouts={workouts} cardioLogs={cardioLogs} />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
                  >
                    {saving ? '保存中...' : '📥 画像として保存'}
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="px-5 py-2.5 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-colors"
                  >
                    閉じる
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
