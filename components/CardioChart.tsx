'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { createClient } from '@/lib/supabase';
import type { CardioLog, CardioActivityType } from '@/types';

type Metric = 'distance' | 'duration' | 'speed' | 'incline';
type ActivityFilter = 'all' | CardioActivityType;

interface ChartPoint {
  date: string;
  value: number;
}

const METRIC_CONFIG: Record<Metric, { label: string; unit: string; color: string }> = {
  distance: { label: '距離',  unit: 'km',   color: '#10b981' },
  duration: { label: '時間',  unit: '分',   color: '#3b82f6' },
  speed:    { label: '速度',  unit: 'km/h', color: '#f59e0b' },
  incline:  { label: '傾斜',  unit: '%',    color: '#8b5cf6' },
};

const getValue = (log: CardioLog, metric: Metric): number | null => {
  switch (metric) {
    case 'distance': return log.distance;
    case 'duration': return log.duration;
    case 'speed':    return log.speed;
    case 'incline':  return log.incline;
  }
};

const WINDOW_SIZE = 10;

export default function CardioChart() {
  const [logs, setLogs] = useState<CardioLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<Metric>('distance');
  const [filter, setFilter] = useState<ActivityFilter>('all');
  const [startIndex, setStartIndex] = useState(Infinity);
  const supabase = createClient();

  useEffect(() => {
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('cardio_logs')
        .select('*')
        .order('date', { ascending: true });
      setLogs(data || []);
      setLoading(false);
    };
    fetchLogs();
  }, [supabase]);


  const filteredLogs =
    filter === 'all' ? logs : logs.filter((l) => l.activity_type === filter);

  const chartData: ChartPoint[] = filteredLogs
    .filter((l) => getValue(l, metric) != null)
    .map((l) => ({
      date: new Date(l.date).toLocaleDateString('ja-JP', {
        month: 'short',
        day: 'numeric',
      }),
      value: getValue(l, metric) as number,
    }));

  const maxStart = Math.max(0, chartData.length - WINDOW_SIZE);
  const clampedStart = Math.min(startIndex, maxStart);
  const visibleData = chartData.slice(clampedStart, clampedStart + WINDOW_SIZE);

  const cfg = METRIC_CONFIG[metric];
  const values = chartData.map((d) => d.value);
  const total = values.reduce((a, b) => a + b, 0);
  const max = values.length ? Math.max(...values) : 0;
  const avg = values.length ? total / values.length : 0;

  const fmt = (v: number) =>
    metric === 'distance' || metric === 'speed' || metric === 'incline'
      ? v.toFixed(1)
      : String(Math.round(v));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 指標選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          指標
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(Object.keys(METRIC_CONFIG) as Metric[]).map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`px-3 py-2 text-sm font-medium rounded-md border transition-colors ${
                metric === m
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              {METRIC_CONFIG[m].label}（{METRIC_CONFIG[m].unit}）
            </button>
          ))}
        </div>
      </div>

      {/* アクティビティフィルター */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          アクティビティ
        </label>
        <div className="flex rounded-md shadow-sm">
          {(
            [
              { id: 'all', label: 'すべて' },
              { id: 'running', label: '🏃 ランニング' },
              { id: 'walking', label: '🚶 ウォーキング' },
            ] as const
          ).map(({ id, label }, i) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`flex-1 px-4 py-2 text-sm font-medium border transition-colors ${
                i === 0
                  ? 'rounded-l-md'
                  : i === 2
                  ? 'rounded-r-md border-l-0'
                  : 'border-l-0'
              } ${
                filter === id
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* グラフ */}
      {chartData.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-500 dark:text-gray-400">
            {cfg.label}のデータがありません
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
            {cfg.label}の推移（{cfg.unit}）
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={visibleData}
                margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
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
                  width={45}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1f2937',
                    border: 'none',
                    borderRadius: '0.375rem',
                    color: '#fff',
                  }}
                  formatter={(v: number) => [`${v} ${cfg.unit}`, cfg.label]}
                  labelFormatter={(l) => `日付: ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  name={`${cfg.label} (${cfg.unit})`}
                  stroke={cfg.color}
                  strokeWidth={2}
                  dot={{ fill: cfg.color, strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 10 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          {/* 日付スライダー */}
          {chartData.length > WINDOW_SIZE && (
            <div className="mt-4 px-1">
              <input
                type="range"
                min={0}
                max={maxStart}
                value={clampedStart}
                onChange={(e) => setStartIndex(Number(e.target.value))}
                className="w-full accent-green-500"
              />
              <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                <span>{chartData[0]?.date}</span>
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 統計サマリー */}
      {chartData.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">合計</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {fmt(total)}
              <span className="text-sm font-normal ml-1 text-gray-500">{cfg.unit}</span>
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">最大</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {fmt(max)}
              <span className="text-sm font-normal ml-1 text-gray-500">{cfg.unit}</span>
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400">平均</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {fmt(avg)}
              <span className="text-sm font-normal ml-1 text-gray-500">{cfg.unit}</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
