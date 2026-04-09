'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase';
import type { CardioLog } from '@/types';
import CardioForm from './CardioForm';

export default function CardioList() {
  const [logs, setLogs] = useState<CardioLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      const { data } = await supabase
        .from('cardio_logs')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [supabase, refreshCount]);

  const handleDelete = async (id: string) => {
    if (!confirm('この記録を削除しますか？')) return;
    setDeletingId(id);
    await supabase.from('cardio_logs').delete().eq('id', id);
    setLogs((prev) => prev.filter((l) => l.id !== id));
    setDeletingId(null);
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'short',
    });

  const formatDuration = (min: number) => {
    if (min < 60) return `${min}分`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}時間${m}分` : `${h}時間`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (logs.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
        <p className="text-gray-500 dark:text-gray-400">まだ記録がありません</p>
      </div>
    );
  }

  // 日付でグループ化
  const grouped = logs.reduce<Record<string, CardioLog[]>>((acc, log) => {
    if (!acc[log.date]) acc[log.date] = [];
    acc[log.date].push(log);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([date, dateLogs]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            {formatDate(date)}
          </h3>
          <div className="space-y-3">
            {dateLogs.map((log) => (
              <div key={log.id}>
                {editingId === log.id ? (
                  <CardioForm
                    initialData={log}
                    onSaved={() => {
                      setEditingId(null);
                      setRefreshCount((c) => c + 1);
                    }}
                    onCancel={() => setEditingId(null)}
                  />
                ) : (
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    {/* ヘッダー行 */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {log.activity_type === 'running' ? '🏃' : '🚶'}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            log.activity_type === 'running'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                              : 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                          }`}
                        >
                          {log.activity_type === 'running' ? 'ランニング' : 'ウォーキング'}
                        </span>
                      </div>
                      <div className="flex">
                        <button
                          onClick={() => setEditingId(log.id)}
                          className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                          title="編集"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={deletingId === log.id}
                          className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                          title="削除"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* メトリクス */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {log.distance != null && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <span>📍</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {log.distance} km
                          </span>
                        </div>
                      )}
                      {log.duration != null && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <span>⏱</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {formatDuration(log.duration)}
                          </span>
                        </div>
                      )}
                      {log.speed != null && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <span>⚡</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            {log.speed} km/h
                          </span>
                        </div>
                      )}
                      {log.incline != null && (
                        <div className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-400">
                          <span>⛰</span>
                          <span className="font-medium text-gray-800 dark:text-gray-200">
                            傾斜 {log.incline}%
                          </span>
                        </div>
                      )}
                    </div>

                    {log.memo && (
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 italic">
                        {log.memo}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
