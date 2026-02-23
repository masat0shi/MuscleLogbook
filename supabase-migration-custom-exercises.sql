-- Migration: Add custom exercises support
-- Run this in Supabase SQL Editor

-- Add user_id column to exercises table (nullable - null means default/shared exercise)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add video_url column for reference videos (YouTube等)
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create index for user exercises
CREATE INDEX IF NOT EXISTS idx_exercises_user_id ON exercises(user_id);

-- Drop existing policies
DROP POLICY IF EXISTS "Exercises are viewable by authenticated users" ON exercises;
DROP POLICY IF EXISTS "Users can view default and own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can insert own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can update own exercises" ON exercises;
DROP POLICY IF EXISTS "Users can delete own exercises" ON exercises;

-- New policies for exercises
-- Users can view: default exercises (user_id is null) OR their own exercises
CREATE POLICY "Users can view default and own exercises" ON exercises
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Users can insert their own exercises
CREATE POLICY "Users can insert own exercises" ON exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own exercises (not default ones)
CREATE POLICY "Users can update own exercises" ON exercises
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own exercises (not default ones)
CREATE POLICY "Users can delete own exercises" ON exercises
  FOR DELETE USING (auth.uid() = user_id);

-- Table for tracking hidden default exercises per user
CREATE TABLE IF NOT EXISTS hidden_exercises (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE hidden_exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for hidden_exercises (for re-running)
DROP POLICY IF EXISTS "Users can view own hidden exercises" ON hidden_exercises;
DROP POLICY IF EXISTS "Users can insert own hidden exercises" ON hidden_exercises;
DROP POLICY IF EXISTS "Users can delete own hidden exercises" ON hidden_exercises;

-- Users can only manage their own hidden exercises
CREATE POLICY "Users can view own hidden exercises" ON hidden_exercises
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own hidden exercises" ON hidden_exercises
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own hidden exercises" ON hidden_exercises
  FOR DELETE USING (auth.uid() = user_id);

-- ユーザーごとの種目動画URL設定テーブル
-- デフォルト種目にも動画URLを設定できるようにする
CREATE TABLE IF NOT EXISTS exercise_video_urls (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  video_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, exercise_id)
);

-- Enable RLS
ALTER TABLE exercise_video_urls ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for re-running)
DROP POLICY IF EXISTS "Users can view own exercise video urls" ON exercise_video_urls;
DROP POLICY IF EXISTS "Users can insert own exercise video urls" ON exercise_video_urls;
DROP POLICY IF EXISTS "Users can update own exercise video urls" ON exercise_video_urls;
DROP POLICY IF EXISTS "Users can delete own exercise video urls" ON exercise_video_urls;

-- Users can only manage their own video URLs
CREATE POLICY "Users can view own exercise video urls" ON exercise_video_urls
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own exercise video urls" ON exercise_video_urls
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own exercise video urls" ON exercise_video_urls
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own exercise video urls" ON exercise_video_urls
  FOR DELETE USING (auth.uid() = user_id);
