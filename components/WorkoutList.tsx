'use client';

/**
 * WorkoutList - トレーニング履歴一覧コンポーネント
 *
 * トレーニング記録を日付別にグループ化して表示。
 * 編集・削除機能付き。
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { Workout, CardioLog } from '@/types';
import WorkoutForm from './WorkoutForm';

type UnifiedEntry =
  | { kind: 'workout'; data: Workout }
  | { kind: 'cardio'; data: CardioLog };

/** コンポーネントのプロパティ */
interface WorkoutListProps {
  filterDate?: string;    // 特定の日付でフィルタリング（YYYY-MM-DD形式）
  limit?: number;         // 表示件数の上限
  showActions?: boolean;  // 編集・削除ボタンの表示フラグ
  showCardio?: boolean;   // カーディオも表示するフラグ
}

export default function WorkoutList({ filterDate, limit, showActions = true, showCardio = false }: WorkoutListProps) {
  // 状態管理
  const [workouts, setWorkouts] = useState<Workout[]>([]);            // ワークアウト一覧
  const [cardioLogs, setCardioLogs] = useState<CardioLog[]>([]);      // カーディオ一覧
  const [loading, setLoading] = useState(true);                        // 読み込み中フラグ
  const [editingWorkout, setEditingWorkout] = useState<Workout | null>(null); // 編集中のワークアウト
  const [deletingId, setDeletingId] = useState<string | null>(null);  // 削除中のワークアウトID

  const supabase = createClient();

  /**
   * ワークアウト一覧を取得
   * 種目情報をJOINして取得し、日付の新しい順にソート
   */
  const fetchWorkouts = async () => {
    setLoading(true);

    let query = supabase
      .from('workouts')
      .select(`
        *,
        exercise:exercises(*)
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    // 日付フィルタリング
    if (filterDate) {
      query = query.eq('date', filterDate);
    }

    const workoutFetch = query.then(({ data, error }) => {
      if (error) {
        console.error('ワークアウトの取得に失敗:', error);
      } else {
        setWorkouts(data || []);
      }
    });

    if (showCardio) {
      let cardioQuery = supabase
        .from('cardio_logs')
        .select('*')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (filterDate) {
        cardioQuery = cardioQuery.eq('date', filterDate);
      }

      const cardioFetch = cardioQuery.then(({ data, error }) => {
        if (error) {
          console.error('カーディオの取得に失敗:', error);
        } else {
          setCardioLogs(data || []);
        }
      });

      await Promise.all([workoutFetch, cardioFetch]);
    } else {
      await workoutFetch;
    }
    setLoading(false);
  };

  // 初回読み込みとフィルタ条件変更時にデータを取得
  useEffect(() => {
    fetchWorkouts();
  }, [filterDate, limit, showCardio]);

  /**
   * ワークアウトを削除
   */
  const handleDelete = async (id: string) => {
    if (!confirm('この記録を削除してよろしいですか？')) {
      return;
    }

    setDeletingId(id);
    const { error } = await supabase.from('workouts').delete().eq('id', id);

    if (error) {
      console.error('削除に失敗:', error);
      alert('削除に失敗しました');
    } else {
      // ローカルの状態から削除
      setWorkouts(workouts.filter((w) => w.id !== id));
    }
    setDeletingId(null);
  };

  /**
   * 日付を日本語形式にフォーマット
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00');
    const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
    const y = date.getFullYear();
    const m = date.getMonth() + 1;
    const d = date.getDate();
    const w = weekdays[date.getDay()];
    return `${y}年${m}月${d}日(${w})`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // workouts と cardio を統合してソート・件数制限
  const allEntries: UnifiedEntry[] = [
    ...workouts.map((w): UnifiedEntry => ({ kind: 'workout', data: w })),
    ...(showCardio ? cardioLogs.map((c): UnifiedEntry => ({ kind: 'cardio', data: c })) : []),
  ].sort((a, b) => {
    const dateDiff = b.data.date.localeCompare(a.data.date);
    if (dateDiff !== 0) return dateDiff;
    return b.data.created_at.localeCompare(a.data.created_at);
  });

  const limitedEntries = limit ? allEntries.slice(0, limit) : allEntries;

  if (limitedEntries.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">
          {filterDate ? 'この日のトレーニング記録はありません' : 'トレーニング記録がありません'}
        </p>
      </div>
    );
  }

  if (editingWorkout) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            記録を編集
          </h3>
          <button
            onClick={() => setEditingWorkout(null)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            キャンセル
          </button>
        </div>
        <WorkoutForm
          workoutId={editingWorkout.id}
          initialData={{
            exercise_id: editingWorkout.exercise_id,
            weight: editingWorkout.weight,
            reps: editingWorkout.reps,
            sets: editingWorkout.sets,
            date: editingWorkout.date,
          }}
          onSuccess={() => {
            setEditingWorkout(null);
            fetchWorkouts();
          }}
        />
      </div>
    );
  }

  // 日付別にグループ化
  const groupedEntries = limitedEntries.reduce((acc, entry) => {
    const date = entry.data.date;
    if (!acc[date]) acc[date] = [];
    acc[date].push(entry);
    return acc;
  }, {} as Record<string, UnifiedEntry[]>);

  const activityLabel: Record<string, string> = {
    running: 'ランニング',
    walking: 'ウォーキング',
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntries).map(([date, entries]) => (
        <div key={date} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {formatDate(date)}
            </h3>
          </div>
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {entries.map((entry) => {
              if (entry.kind === 'workout') {
                const workout = entry.data;
                return (
                  <li key={`w-${workout.id}`} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {workout.exercise?.category}
                          </span>
                          <h4 className="text-base font-medium text-gray-900 dark:text-white">
                            {workout.exercise?.name}
                          </h4>
                          {workout.exercise?.video_url && (
                            <a
                              href={workout.exercise.video_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-red-500 hover:text-red-600"
                              title="参考動画を見る"
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                              </svg>
                            </a>
                          )}
                        </div>
                        <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                            {workout.weight} kg
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            {workout.reps} 回
                          </span>
                          <span className="flex items-center">
                            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            {workout.sets} セット
                          </span>
                        </div>
                      </div>
                      {showActions && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setEditingWorkout(workout)}
                            className="p-2 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                            title="編集"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(workout.id)}
                            disabled={deletingId === workout.id}
                            className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-50"
                            title="削除"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              } else {
                const cardio = entry.data;
                return (
                  <li key={`c-${cardio.id}`} className="px-4 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            カーディオ
                          </span>
                          <h4 className="text-base font-medium text-gray-900 dark:text-white">
                            {activityLabel[cardio.activity_type] ?? cardio.activity_type}
                          </h4>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-gray-400">
                          {cardio.distance != null && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                              </svg>
                              {cardio.distance} km
                            </span>
                          )}
                          {cardio.duration != null && (
                            <span className="flex items-center">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {cardio.duration} 分
                            </span>
                          )}
                          {cardio.speed != null && (
                            <span>{cardio.speed} km/h</span>
                          )}
                          {cardio.incline != null && (
                            <span>傾斜 {cardio.incline}%</span>
                          )}
                        </div>
                        {cardio.memo && (
                          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">{cardio.memo}</p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              }
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
