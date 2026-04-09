'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import WorkoutForm from '@/components/WorkoutForm';
import CardioForm from '@/components/CardioForm';
import type { Exercise } from '@/types';

type ActivityType = 'muscle' | 'cardio';

export default function RecordPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activityType, setActivityType] = useState<ActivityType>('muscle');
  const [preloadedExercises, setPreloadedExercises] = useState<Exercise[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkAuth = async () => {
      const [
        { data: { user } },
        { data: exercisesData },
        { data: hiddenData },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.from('exercises').select('*').order('category').order('name'),
        supabase.from('hidden_exercises').select('exercise_id'),
      ]);

      if (!user) {
        router.push('/login');
        setLoading(false);
        return;
      }

      const hiddenIds = new Set((hiddenData || []).map((h: { exercise_id: string }) => h.exercise_id));
      const visible = (exercisesData || []).filter((e: Exercise) => !hiddenIds.has(e.id));
      setPreloadedExercises(visible);
      setIsAuthenticated(true);
      setLoading(false);
    };
    checkAuth();
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        記録
      </h1>

      {/* 筋トレ / カーディオ 切り替え */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActivityType('muscle')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activityType === 'muscle'
              ? 'border-blue-500 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          💪 筋トレ
        </button>
        <button
          onClick={() => setActivityType('cardio')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            activityType === 'cardio'
              ? 'border-green-500 text-green-600 dark:text-green-400'
              : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
        >
          🏃 カーディオ
        </button>
      </div>

      {activityType === 'muscle' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
          <WorkoutForm preloadedExercises={preloadedExercises} />
        </div>
      )}
      {activityType === 'cardio' && (
        <CardioForm />
      )}
    </div>
  );
}
