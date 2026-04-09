'use client';

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { createClient } from '@/lib/supabase';
import WorkoutList from './WorkoutList';
import CardioList from './CardioList';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function WorkoutCalendar() {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set());
  const [cardioDates, setCardioDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    const fetchDates = async () => {
      setLoading(true);
      const [{ data: workouts }, { data: cardios }] = await Promise.all([
        supabase.from('workouts').select('date'),
        supabase.from('cardio_logs').select('date'),
      ]);
      setWorkoutDates(new Set((workouts || []).map((w: { date: string }) => w.date)));
      setCardioDates(new Set((cardios || []).map((c: { date: string }) => c.date)));
      setLoading(false);
    };
    fetchDates();
  }, [supabase]);

  const handleDateChange = (value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setSelectedDate(value[0]);
    }
  };

  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const d = formatDateToString(date);
      if (workoutDates.has(d) || cardioDates.has(d)) {
        return 'react-calendar__tile--workout';
      }
    }
    return null;
  };

  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const d = formatDateToString(date);
      const hasWorkout = workoutDates.has(d);
      const hasCardio = cardioDates.has(d);
      if (!hasWorkout && !hasCardio) return null;
      return (
        <div className="flex justify-center gap-0.5 mt-0.5">
          {hasWorkout && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>}
          {hasCardio  && <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>}
        </div>
      );
    }
    return null;
  };

  const allActiveDates = new Set([...Array.from(workoutDates), ...Array.from(cardioDates)]);

  const getThisMonthCount = (dates: Set<string>): number => {
    const now = new Date();
    return Array.from(dates).filter((d) => {
      const date = new Date(d);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    }).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const selectedDateStr = selectedDate ? formatDateToString(selectedDate) : null;
  const selectedHasWorkout = selectedDateStr ? workoutDates.has(selectedDateStr) : false;
  const selectedHasCardio  = selectedDateStr ? cardioDates.has(selectedDateStr) : false;

  return (
    <div className="space-y-6">
      {/* カレンダー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        {/* 凡例 */}
        <div className="mb-4 flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-orange-500 rounded-sm"></div>
            <span>実施日</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-blue-500 rounded-full"></div>
            <span>筋トレ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full"></div>
            <span>カーディオ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 bg-yellow-400 rounded-full"></div>
            <span>今日</span>
          </div>
        </div>

        <Calendar
          onChange={handleDateChange}
          value={selectedDate}
          tileClassName={tileClassName}
          tileContent={tileContent}
          locale="ja-JP"
          calendarType="gregory"
          formatDay={(_locale, date) => date.getDate().toString()}
          prevLabel="<"
          nextLabel=">"
          prev2Label="<<"
          next2Label=">>"
        />
      </div>

      {/* 選択日の記録 */}
      {selectedDate && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {selectedDate.toLocaleDateString('ja-JP', {
              year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
            })}の記録
          </h3>

          {!selectedHasWorkout && !selectedHasCardio && (
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">この日の記録はありません</p>
            </div>
          )}

          {selectedHasWorkout && (
            <div>
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">💪 筋トレ</p>
              <WorkoutList filterDate={formatDateToString(selectedDate)} showActions={false} />
            </div>
          )}

          {selectedHasCardio && (
            <div>
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">🏃 カーディオ</p>
              <CardioList filterDate={formatDateToString(selectedDate)} showActions={false} />
            </div>
          )}
        </div>
      )}

      {/* 今月のサマリー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          今月のサマリー
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-blue-500">{getThisMonthCount(workoutDates)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">筋トレ日数</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-green-500">{getThisMonthCount(cardioDates)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">カーディオ日数</p>
          </div>
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-purple-500">{getThisMonthCount(allActiveDates)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">合計アクティブ日</p>
          </div>
        </div>
      </div>
    </div>
  );
}
