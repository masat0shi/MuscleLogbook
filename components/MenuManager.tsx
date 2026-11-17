'use client';

/**
 * MenuManager - トレーニングメニュー（ルーティン）管理コンポーネント
 *
 * 「背中+二頭の日」「胸+三頭の日」のようなメニューを作成し、
 * 含める種目とその順序を設定する。記録画面からこのメニューを
 * 選ぶと、その種目だけをまとめて記録できるようになる。
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase';
import type { Exercise, WorkoutMenuWithItems } from '@/types';
import { EXERCISE_CATEGORIES } from '@/types';

export default function MenuManager() {
  const [menus, setMenus] = useState<WorkoutMenuWithItems[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingMenu, setEditingMenu] = useState<WorkoutMenuWithItems | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(); // 選択中の種目ID（順序を保持）
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);

    const [{ data: menusData }, { data: exercisesData }, { data: hiddenData }] = await Promise.all([
      supabase
        .from('workout_menus')
        .select('*, items:workout_menu_items(id, exercise_id, order_index, menu_id, exercise:exercises(id, name, category))')
        .order('created_at', { ascending: true }),
      supabase.from('exercises').select('*').order('category').order('name'),
      supabase.from('hidden_exercises').select('exercise_id'),
    ]);

    const hiddenIds = new Set((hiddenData || []).map((h: { exercise_id: string }) => h.exercise_id));
    setExercises((exercisesData || []).filter((e: Exercise) => !hiddenIds.has(e.id)));

    const sortedMenus = (menusData || []).map((m: WorkoutMenuWithItems) => ({
      ...m,
      items: [...m.items].sort((a, b) => a.order_index - b.order_index),
    }));
    setMenus(sortedMenus);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openNewForm = () => {
    setEditingMenu(null);
    setNameInput('');
    setSelectedIds([]);
    setError(null);
    setShowForm(true);
  };

  const openEditForm = (menu: WorkoutMenuWithItems) => {
    setEditingMenu(menu);
    setNameInput(menu.name);
    setSelectedIds(menu.items.map(i => i.exercise_id));
    setError(null);
    setShowForm(true);
  };

  const toggleExercise = (exerciseId: string) => {
    setSelectedIds(prev => {
      const current = prev ?? [];
      if (current.includes(exerciseId)) {
        return current.filter(id => id !== exerciseId);
      }
      return [...current, exerciseId];
    });
  };

  const moveSelected = (index: number, direction: -1 | 1) => {
    setSelectedIds(prev => {
      const current = [...(prev ?? [])];
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      [current[index], current[target]] = [current[target], current[index]];
      return current;
    });
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMenu(null);
    setNameInput('');
    setSelectedIds([]);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const ids = selectedIds ?? [];
    if (ids.length === 0) {
      setError('種目を1つ以上選択してください');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('ログインが必要です');
      setSaving(false);
      return;
    }

    let menuId = editingMenu?.id;

    if (editingMenu) {
      const { error: updateError } = await supabase
        .from('workout_menus')
        .update({ name: nameInput })
        .eq('id', editingMenu.id);
      if (updateError) {
        setError('更新に失敗しました: ' + updateError.message);
        setSaving(false);
        return;
      }
      // 既存の項目を全削除してから選び直した内容で再作成する
      await supabase.from('workout_menu_items').delete().eq('menu_id', editingMenu.id);
    } else {
      const { data, error: insertError } = await supabase
        .from('workout_menus')
        .insert({ name: nameInput, user_id: user.id })
        .select()
        .single();
      if (insertError || !data) {
        setError('作成に失敗しました: ' + insertError?.message);
        setSaving(false);
        return;
      }
      menuId = data.id;
    }

    const itemRows = ids.map((exerciseId, index) => ({
      menu_id: menuId,
      exercise_id: exerciseId,
      order_index: index,
    }));
    const { error: itemsError } = await supabase.from('workout_menu_items').insert(itemRows);

    if (itemsError) {
      setError('種目の保存に失敗しました: ' + itemsError.message);
      setSaving(false);
      return;
    }

    handleCancel();
    await fetchData();
    setSaving(false);
  };

  const handleDelete = async (menu: WorkoutMenuWithItems) => {
    if (!confirm(`「${menu.name}」を削除してよろしいですか？`)) return;
    const { error } = await supabase.from('workout_menus').delete().eq('id', menu.id);
    if (error) {
      alert('削除に失敗しました: ' + error.message);
    } else {
      fetchData();
    }
  };

  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) acc[exercise.category] = [];
    acc[exercise.category].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  const exerciseById = new Map(exercises.map(e => [e.id, e]));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showForm ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {editingMenu ? 'メニューを編集' : '新しいメニューを追加'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-900/30 p-3">
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                メニュー名
              </label>
              <input
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="例: 背中+二頭の日"
                required
                autoFocus
              />
            </div>

            {/* 選択中の種目（順序つき） */}
            {(selectedIds ?? []).length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  選択中の種目（この順番で記録画面に表示されます）
                </label>
                <ul className="space-y-1 mb-2">
                  {(selectedIds ?? []).map((id, index) => (
                    <li
                      key={id}
                      className="flex items-center justify-between px-3 py-1.5 bg-gray-50 dark:bg-gray-700/50 rounded-md text-sm text-gray-700 dark:text-gray-200"
                    >
                      <span>{exerciseById.get(id)?.name ?? '(削除された種目)'}</span>
                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => moveSelected(index, -1)}
                          disabled={index === 0}
                          className="px-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSelected(index, 1)}
                          disabled={index === (selectedIds ?? []).length - 1}
                          className="px-1.5 text-gray-400 hover:text-blue-500 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleExercise(id)}
                          className="px-1.5 text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                種目を選択
              </label>
              <div className="max-h-64 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md p-3 space-y-3">
                {EXERCISE_CATEGORIES.map((category) => {
                  const categoryExercises = groupedExercises[category] || [];
                  if (categoryExercises.length === 0) return null;
                  return (
                    <div key={category}>
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{category}</p>
                      <div className="flex flex-wrap gap-2">
                        {categoryExercises.map((exercise) => {
                          const checked = (selectedIds ?? []).includes(exercise.id);
                          return (
                            <button
                              type="button"
                              key={exercise.id}
                              onClick={() => toggleExercise(exercise.id)}
                              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                                checked
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                              }`}
                            >
                              {exercise.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {saving ? '保存中...' : (editingMenu ? '更新' : '作成')}
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
          onClick={openNewForm}
          className="w-full py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-colors flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>新しいメニューを追加</span>
        </button>
      )}

      {menus.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          まだメニューが作成されていません。「背中+二頭の日」のようなメニューを作って記録を快適にしましょう。
        </p>
      ) : (
        <div className="space-y-3">
          {menus.map((menu) => (
            <div key={menu.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white">{menu.name}</h4>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => openEditForm(menu)}
                    className="p-1.5 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400"
                    title="編集"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDelete(menu)}
                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400"
                    title="削除"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {menu.items.map((item) => (
                  <span
                    key={item.id}
                    className="px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                  >
                    {item.exercise?.name ?? '(削除された種目)'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
