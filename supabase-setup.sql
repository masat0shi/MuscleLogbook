-- MuscleLogbook Supabase Setup SQL
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create exercises table (exercise master)
CREATE TABLE IF NOT EXISTS exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create workouts table (training records)
CREATE TABLE IF NOT EXISTS workouts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  sets INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_workouts_user_id ON workouts(user_id);
CREATE INDEX IF NOT EXISTS idx_workouts_exercise_id ON workouts(exercise_id);
CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);

-- Enable Row Level Security
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running)
DROP POLICY IF EXISTS "Exercises are viewable by authenticated users" ON exercises;
DROP POLICY IF EXISTS "Users can view their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can insert their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can update their own workouts" ON workouts;
DROP POLICY IF EXISTS "Users can delete their own workouts" ON workouts;

-- Exercises are readable by all authenticated users
CREATE POLICY "Exercises are viewable by authenticated users" ON exercises
  FOR SELECT USING (auth.role() = 'authenticated');

-- Users can only see their own workouts
CREATE POLICY "Users can view their own workouts" ON workouts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own workouts" ON workouts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own workouts" ON workouts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own workouts" ON workouts
  FOR DELETE USING (auth.uid() = user_id);

-- Insert default exercises (if table is empty)
INSERT INTO exercises (name, category)
SELECT * FROM (VALUES
  ('ベンチプレス', '胸'),
  ('インクラインベンチプレス', '胸'),
  ('ダンベルフライ', '胸'),
  ('チェストプレス', '胸'),
  ('デッドリフト', '背中'),
  ('ラットプルダウン', '背中'),
  ('ベントオーバーロウ', '背中'),
  ('シーテッドロウ', '背中'),
  ('スクワット', '脚'),
  ('レッグプレス', '脚'),
  ('レッグカール', '脚'),
  ('レッグエクステンション', '脚'),
  ('ショルダープレス', '肩'),
  ('サイドレイズ', '肩'),
  ('フロントレイズ', '肩'),
  ('リアデルトフライ', '肩'),
  ('バイセップカール', '腕'),
  ('トライセップエクステンション', '腕'),
  ('ハンマーカール', '腕'),
  ('プランク', 'コア'),
  ('アブローラー', 'コア'),
  ('クランチ', 'コア')
) AS new_exercises(name, category)
WHERE NOT EXISTS (SELECT 1 FROM exercises LIMIT 1);
