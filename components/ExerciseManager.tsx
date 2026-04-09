'use client';

/**
 * ExerciseManager - 種目管理コンポーネント
 *
 * カスタム種目の追加・編集・削除と、
 * デフォルト種目の表示/非表示設定を管理する。
 */

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase';
import type { Exercise } from '@/types';
import { EXERCISE_CATEGORIES } from '@/types';

export default function ExerciseManager() {
  // 状態管理
  const [exercises, setExercises] = useState<Exercise[]>([]);                    // 種目一覧
  const [hiddenExerciseIds, setHiddenExerciseIds] = useState<Set<string>>(new Set()); // 非表示種目IDのセット
  const [exerciseVideoUrls, setExerciseVideoUrls] = useState<Map<string, string>>(new Map()); // デフォルト種目の動画URL
  const [loading, setLoading] = useState(true);                                   // 読み込み中フラグ
  const [showForm, setShowForm] = useState(false);                               // 追加/編集フォーム表示
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null); // 編集中の種目
  const [formData, setFormData] = useState({ name: '', category: '胸', video_url: '' }); // フォームの入力値
  const [saving, setSaving] = useState(false);                                    // 保存中フラグ
  const [error, setError] = useState<string | null>(null);                       // エラーメッセージ
  const [showHidden, setShowHidden] = useState(false);                           // 非表示種目を表示するか
  const [editingVideoExercise, setEditingVideoExercise] = useState<Exercise | null>(null); // 動画URL編集中の種目
  const [videoUrlInput, setVideoUrlInput] = useState('');                        // 動画URL入力値

  const supabase = createClient();
  const formRef = useRef<HTMLDivElement>(null);


  /**
   * 種目一覧と非表示設定を取得
   */
  const fetchExercises = async () => {
    setLoading(true);

    // 全種目を取得（管理用なので非表示も含む）
    const { data: exercisesData, error: exercisesError } = await supabase
      .from('exercises')
      .select('*')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (exercisesError) {
      console.error('種目の取得に失敗:', exercisesError);
    } else {
      setExercises(exercisesData || []);
    }

    // 非表示設定を取得
    const { data: hiddenData, error: hiddenError } = await supabase
      .from('hidden_exercises')
      .select('exercise_id');

    if (hiddenError) {
      console.error('非表示設定の取得に失敗:', hiddenError);
    } else {
      setHiddenExerciseIds(new Set((hiddenData || []).map(h => h.exercise_id)));
    }

    // ユーザー設定の動画URLを取得
    const { data: videoUrlData } = await supabase
      .from('exercise_video_urls')
      .select('exercise_id, video_url');

    setExerciseVideoUrls(new Map((videoUrlData || []).map(v => [v.exercise_id, v.video_url])));

    setLoading(false);
  };

  useEffect(() => {
    fetchExercises();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('ログインが必要です');
      setSaving(false);
      return;
    }

    if (editingExercise) {
      // 既存種目の更新
      const { error } = await supabase
        .from('exercises')
        .update({
          name: formData.name,
          category: formData.category,
          video_url: formData.video_url || null,
        })
        .eq('id', editingExercise.id);

      if (error) {
        setError('更新に失敗しました: ' + error.message);
      } else {
        setEditingExercise(null);
        setShowForm(false);
        setFormData({ name: '', category: '胸', video_url: '' });
        fetchExercises();
      }
    } else {
      // 新規種目の追加
      const { error } = await supabase
        .from('exercises')
        .insert({
          name: formData.name,
          category: formData.category,
          video_url: formData.video_url || null,
          user_id: user.id,
        });

      if (error) {
        setError('追加に失敗しました: ' + error.message);
      } else {
        setShowForm(false);
        setFormData({ name: '', category: '胸', video_url: '' });
        fetchExercises();
      }
    }
    setSaving(false);
  };

  const handleEdit = (exercise: Exercise) => {
    setEditingExercise(exercise);
    setFormData({
      name: exercise.name,
      category: exercise.category,
      video_url: exercise.video_url || '',
    });
    setShowForm(true);
    setError(null);
    // DOM更新後にスクロール（すでにフォームが表示中の場合も対応）
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const handleDelete = async (exercise: Exercise) => {
    if (!confirm(`「${exercise.name}」を削除してよろしいですか？`)) {
      return;
    }

    const { error } = await supabase
      .from('exercises')
      .delete()
      .eq('id', exercise.id);

    if (error) {
      alert('削除に失敗しました: ' + error.message);
    } else {
      fetchExercises();
    }
  };

  const handleHideAllDefaults = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const defaultExercises = exercises.filter(e => !e.user_id && !hiddenExerciseIds.has(e.id));
    if (defaultExercises.length === 0) return;

    const inserts = defaultExercises.map(e => ({ user_id: user.id, exercise_id: e.id }));
    const { error } = await supabase.from('hidden_exercises').insert(inserts);

    if (!error) {
      setHiddenExerciseIds(prev => new Set([...Array.from(prev), ...defaultExercises.map(e => e.id)]));
    }
  };

  const handleSaveVideoUrl = async () => {
    if (!editingVideoExercise) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (videoUrlInput.trim() === '') {
      // URL削除
      const { error } = await supabase
        .from('exercise_video_urls')
        .delete()
        .eq('user_id', user.id)
        .eq('exercise_id', editingVideoExercise.id);
      if (error) {
        alert('削除に失敗しました: ' + error.message);
        return;
      }
      setExerciseVideoUrls(prev => {
        const next = new Map(prev);
        next.delete(editingVideoExercise.id);
        return next;
      });
    } else {
      // URL追加/更新 (upsert)
      const { error } = await supabase
        .from('exercise_video_urls')
        .upsert(
          { user_id: user.id, exercise_id: editingVideoExercise.id, video_url: videoUrlInput.trim() },
          { onConflict: 'user_id,exercise_id' }
        );
      if (error) {
        alert('保存に失敗しました: ' + error.message);
        return;
      }
      setExerciseVideoUrls(prev => new Map(prev).set(editingVideoExercise.id, videoUrlInput.trim()));
    }
    setEditingVideoExercise(null);
    setVideoUrlInput('');
  };

  const handleToggleVisibility = async (exercise: Exercise) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const isHidden = hiddenExerciseIds.has(exercise.id);

    if (isHidden) {
      // Show the exercise (remove from hidden)
      const { error } = await supabase
        .from('hidden_exercises')
        .delete()
        .eq('exercise_id', exercise.id)
        .eq('user_id', user.id);

      if (!error) {
        setHiddenExerciseIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(exercise.id);
          return newSet;
        });
      }
    } else {
      // Hide the exercise
      const { error } = await supabase
        .from('hidden_exercises')
        .insert({
          user_id: user.id,
          exercise_id: exercise.id,
        });

      if (!error) {
        setHiddenExerciseIds(prev => new Set([...Array.from(prev), exercise.id]));
      }
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingExercise(null);
    setFormData({ name: '', category: '胸', video_url: '' });
    setError(null);
  };

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = [];
    }
    acc[exercise.category].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 動画URL編集モーダル */}
      {editingVideoExercise && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              参考動画URLを設定
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{editingVideoExercise.name}</p>
            <input
              type="url"
              value={videoUrlInput}
              onChange={(e) => setVideoUrlInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white mb-4"
              placeholder="https://www.youtube.com/watch?v=..."
              autoFocus
            />
            <div className="flex space-x-3">
              <button
                onClick={handleSaveVideoUrl}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                保存
              </button>
              <button
                onClick={() => { setEditingVideoExercise(null); setVideoUrlInput(''); }}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      {showForm ? (
        <div ref={formRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingExercise ? '種目を編集' : '新しい種目を追加'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                種目名
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="例: ダンベルプレス"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                カテゴリ
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {EXERCISE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                参考動画URL（任意）
              </label>
              <input
                type="url"
                value={formData.video_url}
                onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                YouTubeやその他の動画サイトのURLを入力
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? '保存中...' : (editingExercise ? '更新' : '追加')}
              </button>
              <button
                type="button"
                onClick={handleCancel}
                className="flex-1 py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>新しい種目を追加</span>
        </button>
      )}

      {/* Hide all default exercises */}
      {exercises.some(e => !e.user_id && !hiddenExerciseIds.has(e.id)) && (
        <button
          onClick={handleHideAllDefaults}
          className="w-full py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          デフォルト種目を全て非表示にする
        </button>
      )}

      {/* Toggle to show hidden exercises */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          非表示の種目: {hiddenExerciseIds.size}件
        </span>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={showHidden}
            onChange={(e) => setShowHidden(e.target.checked)}
            className="sr-only"
          />
          <div className={`relative w-11 h-6 rounded-full transition-colors ${showHidden ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
            <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${showHidden ? 'translate-x-5' : ''}`}></div>
          </div>
          <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">
            非表示の種目も表示
          </span>
        </label>
      </div>

      {/* Exercise List by Category */}
      {EXERCISE_CATEGORIES.map((category) => {
        const categoryExercises = (groupedExercises[category] || []).filter(
          exercise => showHidden || !hiddenExerciseIds.has(exercise.id)
        );
        if (categoryExercises.length === 0) return null;

        return (
          <div key={category} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 border-b border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {category}
              </h3>
            </div>
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {categoryExercises.map((exercise) => {
                const isHidden = hiddenExerciseIds.has(exercise.id);
                const isDefault = !exercise.user_id;

                return (
                  <li
                    key={exercise.id}
                    className={`px-4 py-3 flex items-center justify-between ${isHidden ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className="text-gray-900 dark:text-white">{exercise.name}</span>
                      {/* 動画リンクアイコン（ユーザー設定URLを優先） */}
                      {(exerciseVideoUrls.get(exercise.id) || exercise.video_url) && (
                        <a
                          href={exerciseVideoUrls.get(exercise.id) || exercise.video_url || ''}
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
                      {exercise.user_id && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          カスタム
                        </span>
                      )}
                      {isHidden && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-600 dark:text-gray-300">
                          非表示
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      {/* 動画URLボタン（デフォルト種目のみ） */}
                      {isDefault && (
                        <button
                          onClick={() => {
                            setEditingVideoExercise(exercise);
                            setVideoUrlInput(exerciseVideoUrls.get(exercise.id) || '');
                          }}
                          className={`p-1.5 rounded transition-colors ${
                            exerciseVideoUrls.has(exercise.id)
                              ? 'text-red-500 hover:text-red-600'
                              : 'text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400'
                          }`}
                          title="参考動画URLを設定"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
                          </svg>
                        </button>
                      )}
                      {/* Visibility toggle for default exercises */}
                      {isDefault && (
                        <button
                          onClick={() => handleToggleVisibility(exercise)}
                          className={`p-1.5 rounded transition-colors ${
                            isHidden
                              ? 'text-gray-400 hover:text-green-500'
                              : 'text-green-500 hover:text-gray-400'
                          }`}
                          title={isHidden ? '表示する' : '非表示にする'}
                        >
                          {isHidden ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          )}
                        </button>
                      )}
                      {/* Edit/Delete for custom exercises */}
                      {exercise.user_id && (
                        <>
                          <button
                            onClick={() => handleEdit(exercise)}
                            className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                            title="編集"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(exercise)}
                            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                            title="削除"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
