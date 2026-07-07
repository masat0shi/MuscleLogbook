'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';
import { getLogicalToday } from '@/lib/date';
import type { CardioActivityType } from '@/types';

interface InitialData {
  id: string;
  activity_type: CardioActivityType;
  distance: number | null;
  duration: number | null;
  incline: number | null;
  speed: number | null;
  date: string;
  memo: string | null;
}

interface Props {
  onSaved?: () => void;
  initialData?: InitialData;
  onCancel?: () => void;
}

export default function CardioForm({ onSaved, initialData, onCancel }: Props) {
  const isEditing = !!initialData;
  const today = getLogicalToday();

  const [activityType, setActivityType] = useState<CardioActivityType>(
    initialData?.activity_type ?? 'running'
  );
  const [distance, setDistance] = useState(initialData?.distance?.toString() ?? '');
  const [duration, setDuration] = useState(initialData?.duration?.toString() ?? '');
  const [incline, setIncline] = useState(initialData?.incline?.toString() ?? '');
  const [speed, setSpeed] = useState(initialData?.speed?.toString() ?? '');
  const [date, setDate] = useState(initialData?.date ?? today);
  const [memo, setMemo] = useState(initialData?.memo ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('ログインが必要です');
      setSaving(false);
      return;
    }

    const payload = {
      user_id: user.id,
      activity_type: activityType,
      distance: distance ? parseFloat(distance) : null,
      duration: duration ? parseInt(duration) : null,
      incline: incline ? parseFloat(incline) : null,
      speed: speed ? parseFloat(speed) : null,
      date,
      memo: memo || null,
    };

    let saveError;
    if (isEditing) {
      const { error: e } = await supabase
        .from('cardio_logs')
        .update(payload)
        .eq('id', initialData.id);
      saveError = e;
    } else {
      const { error: e } = await supabase.from('cardio_logs').insert(payload);
      saveError = e;
    }

    if (saveError) {
      setError('保存に失敗しました');
    } else {
      setSuccess(true);
      if (!isEditing) {
        setDistance('');
        setDuration('');
        setIncline('');
        setSpeed('');
        setMemo('');
        setDate(today);
      }
      onSaved?.();
    }
    setSaving(false);
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white';

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-lg p-6 space-y-5">
      {/* アクティビティ切替 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          アクティビティ
        </label>
        <div className="flex rounded-md shadow-sm">
          <button
            type="button"
            onClick={() => setActivityType('running')}
            className={`flex-1 py-2 text-sm font-medium rounded-l-md border transition-colors ${
              activityType === 'running'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            }`}
          >
            🏃 ランニング
          </button>
          <button
            type="button"
            onClick={() => setActivityType('walking')}
            className={`flex-1 py-2 text-sm font-medium rounded-r-md border-t border-r border-b transition-colors ${
              activityType === 'walking'
                ? 'bg-green-500 text-white border-green-500'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            }`}
          >
            🚶 ウォーキング
          </button>
        </div>
      </div>

      {/* 日付 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          日付
        </label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="mt-1 block px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 dark:bg-gray-700 dark:text-white"
        />
      </div>

      {/* 数値入力 2x2 グリッド */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            距離 (km)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder="例: 5.0"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            時間 (分)
          </label>
          <input
            type="number"
            min="0"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            placeholder="例: 30"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            速度 (km/h)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={speed}
            onChange={(e) => setSpeed(e.target.value)}
            placeholder="例: 8.5"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            傾斜 (%)
          </label>
          <input
            type="number"
            step="0.1"
            min="0"
            value={incline}
            onChange={(e) => setIncline(e.target.value)}
            placeholder="例: 1.0"
            className={inputClass}
          />
        </div>
      </div>

      {/* メモ */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          メモ
        </label>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="自由記述..."
          className={inputClass}
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && !isEditing && (
        <p className="text-green-500 text-sm">記録を保存しました！</p>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium rounded-md transition-colors"
        >
          {saving ? '保存中...' : isEditing ? '更新する' : '記録する'}
        </button>
        {isEditing && onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  );
}
