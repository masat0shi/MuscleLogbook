'use client';

/**
 * WeightChart - 重量・ボリューム推移グラフコンポーネント
 *
 * 選択した種目の重量またはボリューム（重量×回数×セット）の
 * 推移を折れ線グラフで表示する
 */

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase';
import type { Exercise, Workout } from '@/types';

/** グラフ表示用のデータ型 */
interface ChartData {
  date: string;      // 日付（表示用フォーマット）
  weight: number;    // 重量 (kg)
  reps: number;      // 回数
  sets: number;      // セット数
  volume: number;    // ボリューム（重量×回数×セット）
}

/**
 * 数値を見やすい形式にフォーマット
 * 例: 1800 → "1,800"
 */
const formatNumber = (value: number): string => {
  return value.toLocaleString('ja-JP');
};

/**
 * Y軸の値を短縮形式でフォーマット
 * 例: 1800 → "1.8k", 1800000 → "1.8M"
 */
const formatYAxis = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}k`;
  }
  return String(value);
};

export default function WeightChart() {
  // 状態管理
  const [exercises, setExercises] = useState<Exercise[]>([]);           // 種目リスト
  const [selectedExercise, setSelectedExercise] = useState<string>(''); // 選択中の種目ID
  const [chartData, setChartData] = useState<ChartData[]>([]);          // グラフデータ
  const [loading, setLoading] = useState(true);                          // 読み込み中フラグ
  const [metric, setMetric] = useState<'weight' | 'volume'>('weight');  // 表示指標

  const supabase = createClient();

  /**
   * 種目一覧を取得（非表示の種目を除外）
   */
  useEffect(() => {
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

      if (error) {
        console.error('種目の取得に失敗:', error);
      } else {
        // 非表示の種目を除外
        const visibleExercises = (data || []).filter(e => !hiddenIds.has(e.id));
        setExercises(visibleExercises);

        // 最初の種目を選択
        if (visibleExercises.length > 0) {
          setSelectedExercise(visibleExercises[0].id);
        }
      }
      setLoading(false);
    };

    fetchExercises();
  }, [supabase]);

  /**
   * 選択した種目のトレーニング記録を取得
   */
  useEffect(() => {
    const fetchWorkoutData = async () => {
      if (!selectedExercise) return;

      setLoading(true);

      const { data, error } = await supabase
        .from('workouts')
        .select('*')
        .eq('exercise_id', selectedExercise)
        .order('date', { ascending: true });

      if (error) {
        console.error('トレーニング記録の取得に失敗:', error);
      } else {
        // グラフ表示用にデータを整形
        const formattedData: ChartData[] = (data || []).map((workout: Workout) => ({
          date: new Date(workout.date).toLocaleDateString('ja-JP', {
            month: 'short',
            day: 'numeric',
          }),
          weight: workout.weight,
          reps: workout.reps,
          sets: workout.sets,
          volume: workout.weight * workout.reps * workout.sets,
        }));
        setChartData(formattedData);
      }
      setLoading(false);
    };

    fetchWorkoutData();
  }, [selectedExercise, supabase]);

  // 種目をカテゴリ別にグループ化
  const groupedExercises = exercises.reduce((acc, exercise) => {
    if (!acc[exercise.category]) {
      acc[exercise.category] = [];
    }
    acc[exercise.category].push(exercise);
    return acc;
  }, {} as Record<string, Exercise[]>);

  // 選択中の種目名を取得
  const selectedExerciseName = exercises.find(e => e.id === selectedExercise)?.name || '';

  // ローディング表示
  if (loading && exercises.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 種目選択・指標切り替え */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* 種目選択ドロップダウン */}
        <div className="flex-1">
          <label
            htmlFor="exercise-select"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            種目を選択
          </label>
          <select
            id="exercise-select"
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          >
            {Object.entries(groupedExercises).map(([category, categoryExercises]) => (
              <optgroup key={category} label={category}>
                {categoryExercises.map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        {/* 表示指標切り替えボタン */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            表示指標
          </label>
          <div className="flex rounded-md shadow-sm">
            <button
              onClick={() => setMetric('weight')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-md border ${
                metric === 'weight'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              重量 (kg)
            </button>
            <button
              onClick={() => setMetric('volume')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-md border-t border-r border-b ${
                metric === 'volume'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              ボリューム
            </button>
          </div>
        </div>
      </div>

      {/* グラフ表示エリア */}
      {chartData.length === 0 ? (
        // データがない場合のメッセージ
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {selectedExerciseName}の記録がありません
          </p>
        </div>
      ) : (
        // 折れ線グラフ
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {selectedExerciseName}の{metric === 'weight' ? '重量' : 'ボリューム'}推移
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 10,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="date"
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fill: '#6b7280', fontSize: 12 }}
                  tickFormatter={metric === 'volume' ? formatYAxis : undefined}
                  width={50}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: '#fff',
                  }}
                  formatter={(value: number) => [
                    metric === 'weight' ? `${value} kg` : formatNumber(value),
                    metric === 'weight' ? '重量' : 'ボリューム',
                  ]}
                  labelFormatter={(label) => `日付: ${label}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={metric}
                  name={metric === 'weight' ? '重量 (kg)' : 'ボリューム'}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 10, fill: '#2563eb' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 統計サマリーカード */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* 最大重量 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">最大重量</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {Math.max(...chartData.map((d) => d.weight))} kg
            </p>
          </div>
          {/* 最新重量 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">最新重量</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {chartData[chartData.length - 1]?.weight || 0} kg
            </p>
          </div>
          {/* 記録回数 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">記録回数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {chartData.length} 回
            </p>
          </div>
          {/* 最大ボリューム */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">最大ボリューム</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatNumber(Math.max(...chartData.map((d) => d.volume)))}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
