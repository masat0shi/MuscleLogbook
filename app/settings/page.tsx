'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import ExerciseManager from '@/components/ExerciseManager';
import MenuManager from '@/components/MenuManager';

export default function SettingsPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
      } else {
        setIsAuthenticated(true);
      }
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase.auth]);

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
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        設定
      </h1>

      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          トレーニングメニュー
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          「背中+二頭の日」のようなメニューを作成すると、記録画面でその種目だけをまとめて選べるようになります。
        </p>
      </div>

      <MenuManager />

      <div className="mt-10 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          トレーニング種目の管理
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          自分専用のトレーニング種目を追加・編集・削除できます。デフォルトの種目は編集できません。
        </p>
      </div>

      <ExerciseManager />
    </div>
  );
}
