export interface Exercise {
  id: string;
  name: string;
  category: string;
  user_id?: string | null;
  video_url?: string | null;  // 参考動画のURL（YouTube等）
}

export interface Workout {
  id: string;
  user_id: string;
  exercise_id: string;
  weight: number;
  reps: number;
  sets: number;
  date: string;
  created_at: string;
  exercise?: Exercise;
}

export interface WorkoutFormData {
  exercise_id: string;
  weight: number;
  reps: number;
  sets: number;
  date: string;
}

export interface User {
  id: string;
  email: string;
}

export interface HiddenExercise {
  id: string;
  user_id: string;
  exercise_id: string;
}

/** ユーザーごとの種目動画URL設定 */
export interface ExerciseVideoUrl {
  id: string;
  user_id: string;
  exercise_id: string;
  video_url: string;
}

export type ExerciseCategory = '胸' | '背中' | '脚' | '肩' | '腕' | 'コア';

export const EXERCISE_CATEGORIES: ExerciseCategory[] = [
  '胸',
  '背中',
  '脚',
  '肩',
  '腕',
  'コア',
];

export const DEFAULT_EXERCISES: Omit<Exercise, 'id'>[] = [
  { name: 'ベンチプレス', category: '胸' },
  { name: 'インクラインベンチプレス', category: '胸' },
  { name: 'ダンベルフライ', category: '胸' },
  { name: 'チェストプレス', category: '胸' },
  { name: 'デッドリフト', category: '背中' },
  { name: 'ラットプルダウン', category: '背中' },
  { name: 'ベントオーバーロウ', category: '背中' },
  { name: 'シーテッドロウ', category: '背中' },
  { name: 'スクワット', category: '脚' },
  { name: 'レッグプレス', category: '脚' },
  { name: 'レッグカール', category: '脚' },
  { name: 'レッグエクステンション', category: '脚' },
  { name: 'ショルダープレス', category: '肩' },
  { name: 'サイドレイズ', category: '肩' },
  { name: 'フロントレイズ', category: '肩' },
  { name: 'リアデルトフライ', category: '肩' },
  { name: 'バイセップカール', category: '腕' },
  { name: 'トライセップエクステンション', category: '腕' },
  { name: 'ハンマーカール', category: '腕' },
  { name: 'プランク', category: 'コア' },
  { name: 'アブローラー', category: 'コア' },
  { name: 'クランチ', category: 'コア' },
];
