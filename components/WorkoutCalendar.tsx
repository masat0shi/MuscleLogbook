'use client';

/**
 * WorkoutCalendar - トレーニングカレンダーコンポーネント
 *
 * カレンダー形式でトレーニング実施日を表示。
 * 日付をクリックするとその日のトレーニング内容を確認できる。
 */

import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import { createClient } from '@/lib/supabase';
import WorkoutList from './WorkoutList';

/** react-calendarの値の型定義 */
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

export default function WorkoutCalendar() {
  // 状態管理
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);      // 選択中の日付
  const [workoutDates, setWorkoutDates] = useState<Set<string>>(new Set()); // トレーニング実施日のセット
  const [loading, setLoading] = useState(true);                              // 読み込み中フラグ

  const supabase = createClient();

  /**
   * トレーニング実施日の一覧を取得
   */
  useEffect(() => {
    const fetchWorkoutDates = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from('workouts')
        .select('date');

      if (error) {
        console.error('トレーニング日の取得に失敗:', error);
      } else {
        // 日付のSetを作成
        const dates = new Set((data || []).map((w: { date: string }) => w.date));
        setWorkoutDates(dates);
      }
      setLoading(false);
    };

    fetchWorkoutDates();
  }, [supabase]);

  /**
   * カレンダーの日付選択ハンドラー
   */
  const handleDateChange = (value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(value);
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setSelectedDate(value[0]);
    }
  };

  /**
   * DateオブジェクトをYYYY-MM-DD形式の文字列に変換
   */
  const formatDateToString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  /**
   * カレンダーのタイルにクラス名を付与
   * トレーニング実施日に特別なスタイルを適用
   */
  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateString = formatDateToString(date);
      if (workoutDates.has(dateString)) {
        return 'react-calendar__tile--workout';
      }
    }
    return null;
  };

  /**
   * カレンダーのタイルに追加コンテンツを表示
   * トレーニング実施日にドットを表示
   */
  const tileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view === 'month') {
      const dateString = formatDateToString(date);
      if (workoutDates.has(dateString)) {
        return (
          <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
          </div>
        );
      }
    }
    return null;
  };

  /**
   * 今月のトレーニング日数を計算
   */
  const getThisMonthWorkoutCount = (): number => {
    const now = new Date();
    return Array.from(workoutDates).filter((date) => {
      const d = new Date(date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* カレンダー表示エリア */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        {/* 凡例 */}
        <div className="mb-4">
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span>トレーニング実施日</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
              <span>今日</span>
            </div>
          </div>
        </div>

        {/* カレンダー本体 */}
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

      {/* 選択した日のトレーニング一覧 */}
      {selectedDate && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {selectedDate.toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}のトレーニング
          </h3>
          <WorkoutList
            filterDate={formatDateToString(selectedDate)}
            showActions={false}
          />
        </div>
      )}

      {/* 今月のサマリー */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          今月のサマリー
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {/* 今月のトレーニング日数 */}
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-blue-500">
              {getThisMonthWorkoutCount()}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              トレーニング日数
            </p>
          </div>
          {/* 総トレーニング日数 */}
          <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p className="text-3xl font-bold text-green-500">
              {workoutDates.size}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              総トレーニング日数
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
