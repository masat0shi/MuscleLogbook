'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import WorkoutForm from '@/components/WorkoutForm';
import type { Exercise } from '@/types';

export default function RecordPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
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

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        トレーニング記録
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <WorkoutForm preloadedExercises={preloadedExercises} />
      </div>
    </div>
  );
}
