'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';
import WorkoutList from '@/components/WorkoutList';

interface Stats {
  totalWorkouts: number;
  totalDays: number;
  thisMonthDays: number;
}

function StatSkeleton() {
  return <div className="h-8 w-16 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />;
}

function getEncouragement(days: number): { emoji: string; message: string; sub: string; color: string } {
  if (days === 0)  return { emoji: '🌱', message: 'さあ、始めよう！',       sub: '最初の一歩が一番大事',         color: 'bg-gray-100 dark:bg-gray-700' };
  if (days <= 3)   return { emoji: '🔥', message: 'いいスタート！',          sub: 'この調子で続けていこう',        color: 'bg-orange-50 dark:bg-orange-950' };
  if (days <= 7)   return { emoji: '💪', message: '順調だよ！',              sub: '習慣になってきた証拠',          color: 'bg-blue-50 dark:bg-blue-950' };
  if (days <= 14)  return { emoji: '⭐', message: 'すごい！',               sub: '月の半分以上トレーニングしてる', color: 'bg-yellow-50 dark:bg-yellow-950' };
  if (days <= 20)  return { emoji: '🏆', message: 'かなりやり手だね！',      sub: '上位トレーニーの仲間入り',      color: 'bg-purple-50 dark:bg-purple-950' };
  return           { emoji: '👑', message: '伝説のトレーニー！',             sub: 'ほぼ毎日動いてる、すごすぎる', color: 'bg-pink-50 dark:bg-pink-950' };
}

export default function HomePage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const [{ data: { user } }] = await Promise.all([
        supabase.auth.getUser(),
        fetchStats(),
      ]);
      if (!user) {
        router.push('/login');
      } else {
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase.auth]);

  const fetchStats = async () => {
    const [
      { data: workouts, error },
      { data: cardioLogs },
    ] = await Promise.all([
      supabase.from('workouts').select('date').order('date', { ascending: false }),
      supabase.from('cardio_logs').select('date'),
    ]);

    if (error) {
      console.error('Error fetching stats:', error);
      return;
    }

    const allDates = [
      ...(workouts?.map((w) => w.date) || []),
      ...(cardioLogs?.map((c) => c.date) || []),
    ];
    const uniqueDates = [...new Set(allDates)];
    const now = new Date();
    const thisMonth = uniqueDates.filter((date) => {
      const d = new Date(date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    setStats({
      totalWorkouts: (workouts?.length || 0) + (cardioLogs?.length || 0),
      totalDays: uniqueDates.length,
      thisMonthDays: thisMonth.length,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          ダッシュボード
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          トレーニングの記録と進捗を確認しましょう
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">総記録数</p>
              {stats === null ? <StatSkeleton /> : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalWorkouts}</p>
              )}
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">総トレーニング日</p>
              {stats === null ? <StatSkeleton /> : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalDays}</p>
              )}
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
              <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">今月</p>
              {stats === null ? <StatSkeleton /> : (
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.thisMonthDays}日</p>
              )}
            </div>
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
              <svg className="w-6 h-6 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </div>

        {/* 応援カード */}
        {(() => {
          const enc = getEncouragement(stats?.thisMonthDays ?? 0);
          return (
            <div className={`rounded-lg shadow-md p-4 flex items-center gap-3 ${enc.color}`}>
              <span className="text-3xl">{enc.emoji}</span>
              <div>
                <p className="text-sm font-bold text-gray-900 dark:text-white">{enc.message}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{enc.sub}</p>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          href="/record"
          className="flex flex-col items-center p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow-md transition-colors"
        >
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="text-sm font-medium">記録する</span>
        </Link>

        <Link
          href="/history"
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-md transition-colors"
        >
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <span className="text-sm font-medium">履歴を見る</span>
        </Link>

        <Link
          href="/stats"
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-md transition-colors"
        >
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <span className="text-sm font-medium">グラフを見る</span>
        </Link>

        <Link
          href="/calendar"
          className="flex flex-col items-center p-4 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg shadow-md transition-colors"
        >
          <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-sm font-medium">カレンダー</span>
        </Link>
      </div>

      {/* Recent Workouts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            最近のトレーニング
          </h2>
          <Link
            href="/history"
            className="text-sm text-blue-500 hover:text-blue-600"
          >
            すべて見る →
          </Link>
        </div>
        <WorkoutList limit={5} showActions={false} />
      </div>
    </div>
  );
}
