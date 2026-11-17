-- Migration: Add workout menu (routine) support
-- 例: 「背中+二頭の日」「胸+三頭の日」のようなメニューを保存し、
-- 記録画面でその種目だけをまとめて選べるようにする
-- Run this in Supabase SQL Editor

-- トレーニングメニュー（ルーティン）本体
CREATE TABLE IF NOT EXISTS workout_menus (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メニューに含まれる種目（順序付き）
CREATE TABLE IF NOT EXISTS workout_menu_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  menu_id UUID REFERENCES workout_menus(id) ON DELETE CASCADE NOT NULL,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(menu_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_workout_menus_user_id ON workout_menus(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_menu_items_menu_id ON workout_menu_items(menu_id);

-- RLS
ALTER TABLE workout_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (for re-running)
DROP POLICY IF EXISTS "Users can view own workout menus" ON workout_menus;
DROP POLICY IF EXISTS "Users can insert own workout menus" ON workout_menus;
DROP POLICY IF EXISTS "Users can update own workout menus" ON workout_menus;
DROP POLICY IF EXISTS "Users can delete own workout menus" ON workout_menus;

DROP POLICY IF EXISTS "Users can view own workout menu items" ON workout_menu_items;
DROP POLICY IF EXISTS "Users can insert own workout menu items" ON workout_menu_items;
DROP POLICY IF EXISTS "Users can update own workout menu items" ON workout_menu_items;
DROP POLICY IF EXISTS "Users can delete own workout menu items" ON workout_menu_items;

-- workout_menus: 自分のメニューのみ操作可能
CREATE POLICY "Users can view own workout menus" ON workout_menus
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout menus" ON workout_menus
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout menus" ON workout_menus
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout menus" ON workout_menus
  FOR DELETE USING (auth.uid() = user_id);

-- workout_menu_items: 自分のメニューに属する項目のみ操作可能
CREATE POLICY "Users can view own workout menu items" ON workout_menu_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM workout_menus m WHERE m.id = menu_id AND m.user_id = auth.uid())
  );

CREATE POLICY "Users can insert own workout menu items" ON workout_menu_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM workout_menus m WHERE m.id = menu_id AND m.user_id = auth.uid())
  );

CREATE POLICY "Users can update own workout menu items" ON workout_menu_items
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM workout_menus m WHERE m.id = menu_id AND m.user_id = auth.uid())
  );

CREATE POLICY "Users can delete own workout menu items" ON workout_menu_items
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM workout_menus m WHERE m.id = menu_id AND m.user_id = auth.uid())
  );
