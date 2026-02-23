'use client';

/**
 * WorkoutForm - トレーニング記録入力フォームコンポーネント
 *
 * トレーニングの種目、重量、回数、セット数、日付を入力して
 * データベースに保存する。新規作成と編集の両方に対応。
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { Exercise, WorkoutFormData } from '@/types';
import { EXERCISE_CATEGORIES } from '@/types';

/** コンポーネントのプロパティ */
interface WorkoutFormProps {
  onSuccess?: () => void;      // 保存成功時のコールバック
  initialData?: WorkoutFormData; // 編集時の初期データ
  workoutId?: string;          // 編集対象のワークアウトID（新規作成時はundefined）
}

export default function WorkoutForm({ onSuccess, initialData, workoutId }: WorkoutFormProps) {
  // 状態管理
  const [exercises, setExercises] = useState<Exercise[]>([]);                    // 種目リスト
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(new Set()); // 非表示種目ID
  const [loading, setLoading] = useState(false);                                  // 保存中フラグ
  const [error, setError] = useState<string | null>(null);                       // エラーメッセージ
  const [success, setSuccess] = useState(false);                                  // 成功フラグ
  const [showAddExercise, setShowAddExercise] = useState(false);                 // 種目追加モーダル表示
  const [newExercise, setNewExercise] = useState({ name: '', category: '胸' }); // 新規種目データ
  const [addingExercise, setAddingExercise] = useState(false);                   // 種目追加中フラグ

  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  // 数値入力は文字列で管理（空欄表示を可能にするため）
  const [weightInput, setWeightInput] = useState(initialData?.weight ? String(initialData.weight) : '');
  const [repsInput, setRepsInput] = useState(initialData?.reps ? String(initialData.reps) : '');
  const [setsInput, setSetsInput] = useState(initialData?.sets ? String(initialData.sets) : '');

  const [formData, setFormData] = useState({
    exercise_id: initialData?.exercise_id || '',
    date: initialData?.date || today,
  });

  /**
   * 種目一覧を取得（非表示の種目を除外）
   */
  const fetchExercises = async () => {
    // 全種目を取得
    const { data, error } = await supabase
      .from('exercises')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    // 非表示設定を取得
    const { data: hiddenData } = await supabase
      .from('hidden_exercises')
      .select('exercise_id');

    const hiddenIds = new Set((hiddenData || []).map(h => h.exercise_id));
    setHiddenExerciseIds(hiddenIds);

    if (error) {
      console.error('種目の取得に失敗:', error);
    } else {
      // 非表示の種目を除外して設定
      const visibleExercises = (data || []).filter(e => !hiddenIds.has(e.id));
      setExercises(visibleExercises);
      // 初期選択がない場合は最初の種目を選択
      if (visibleExercises.length > 0 && !formData.exercise_id) {
        setFormData(prev => ({ ...prev, exercise_id: visibleExercises[0].id }));
      }
    }
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  /**
   * 新しい種目を追加（モーダルから呼び出し）
   */
  const handleAddExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingExercise(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('ログインが必要です');
      setAddingExercise(false);
      return;
    }

    // 種目をデータベースに追加
    const { data, error } = await supabase
      .from('exercises')
      .insert({
        name: newExercise.name,
        category: newExercise.category,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      setError('種目の追加に失敗しました: ' + error.message);
    } else {
      // モーダルを閉じて種目リストを更新
      setShowAddExercise(false);
      setNewExercise({ name: '', category: '胸' });
      await fetchExercises();
      // 追加した種目を選択状態にする
      if (data) {
        setFormData(prev => ({ ...prev, exercise_id: data.id }));
      }
    }
    setAddingExercise(false);
  };

  /**
   * トレーニング記録を保存
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    // 入力値を数値に変換
    const weight = parseFloat(weightInput) || 0;
    const reps = parseInt(repsInput) || 0;
    const sets = parseInt(setsInput) || 0;

    // バリデーション
    if (weight <= 0 || reps <= 0 || sets <= 0) {
      setError('重量、回数、セット数を入力してください');
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError('ログインが必要です');
      setLoading(false);
      return;
    }

    if (workoutId) {
      // 既存のワークアウトを更新
      const { error } = await supabase
        .from('workouts')
        .update({
          exercise_id: formData.exercise_id,
          weight,
          reps,
          sets,
          date: formData.date,
        })
        .eq('id', workoutId);

      if (error) {
        setError('更新に失敗しました: ' + error.message);
      } else {
        setSuccess(true);
        onSuccess?.();
      }
    } else {
      // 新規ワークアウトを作成
      const { error } = await supabase
        .from('workouts')
        .insert({
          user_id: user.id,
          exercise_id: formData.exercise_id,
          weight,
          reps,
          sets,
          date: formData.date,
        });

      if (error) {
        setError('記録の保存に失敗しました: ' + error.message);
      } else {
        setSuccess(true);
        // 入力欄をリセット
        setWeightInput('');
        setRepsInput('');
        setSetsInput('');
        onSuccess?.();
      }
    }

    setLoading(false);
  };

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = [];
    }
    acc[exercise.category].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  return (
    <div className="space-y-6">
      {/* Add Exercise Modal */}
      {showAddExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              新しい種目を追加
            </h3>
            <form onSubmit={handleAddExercise} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  種目名
                </label>
                <input
                  type="text"
                  value={newExercise.name}
                  onChange={(e) => setNewExercise({ ...newExercise, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="例: ダンベルプレス"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  カテゴリ
                </label>
                <select
                  value={newExercise.category}
                  onChange={(e) => setNewExercise({ ...newExercise, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {EXERCISE_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={addingExercise}
                  className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {addingExercise ? '追加中...' : '追加'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddExercise(false);
                    setNewExercise({ name: '', category: '胸' });
                  }}
                  className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-4">
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 dark:bg-green-900/30 p-4">
            <p className="text-sm text-green-700 dark:text-green-400">
              {workoutId ? '更新しました！' : '記録を保存しました！'}
            </p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label
              htmlFor="exercise"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              種目
            </label>
            <button
              type="button"
              onClick={() => setShowAddExercise(true)}
              className="text-sm text-blue-600 hover:text-blue-500 flex items-center"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              種目を追加
            </button>
          </div>
          <select
            id="exercise"
            value={formData.exercise_id}
            onChange={(e) => setFormData(prev => ({ ...prev, exercise_id: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          >
            {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
              <optgroup key={category} label={category}>
                {categoryExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}{exercise.user_id ? ' ★' : ''}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {/* 選択中の種目に動画URLがある場合、リンクを表示 */}
          {(() => {
            const selectedExercise = exercises.find(e => e.id === formData.exercise_id);
            if (selectedExercise?.video_url) {
              return (
                <a
                  href={selectedExercise.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center text-sm text-red-500 hover:text-red-600"
                >
                  <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                  </svg>
                  参考動画を見る
                </a>
              );
            }
            return null;
          })()}
        </div>

        <div>
          <label
            htmlFor="date"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            日付
          </label>
          <input
            type="date"
            id="date"
            value={formData.date}
            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="weight"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              重量 (kg)
            </label>
            <input
              type="number"
              id="weight"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              min="0"
              step="0.5"
              placeholder="60"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="reps"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              回数
            </label>
            <input
              type="number"
              id="reps"
              value={repsInput}
              onChange={(e) => setRepsInput(e.target.value)}
              min="1"
              placeholder="10"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="sets"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              セット数
            </label>
            <input
              type="number"
              id="sets"
              value={setsInput}
              onChange={(e) => setSetsInput(e.target.value)}
              min="1"
              placeholder="3"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '保存中...' : (workoutId ? '更新する' : '記録する')}
        </button>
      </form>
    </div>
  );
}
