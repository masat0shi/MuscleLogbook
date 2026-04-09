-- カーディオ（ランニング・ウォーキング）ログテーブルの作成
-- 実行方法: Supabase ダッシュボードの SQL Editor で実行してください

-- cardio_logs テーブルの作成
CREATE TABLE IF NOT EXISTS cardio_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('running', 'walking')),
  distance NUMERIC(6, 2),        -- 距離 (km)
  duration INTEGER,              -- 時間 (分)
  incline NUMERIC(4, 1),         -- 傾斜 (%)
  speed NUMERIC(4, 1),           -- 速度 (km/h)
  date DATE NOT NULL,
  memo TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security) を有効化
ALTER TABLE cardio_logs ENABLE ROW LEVEL SECURITY;

-- ユーザーが自分のデータのみ閲覧できるポリシー
CREATE POLICY "Users can view own cardio logs"
  ON cardio_logs FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーが自分のデータのみ挿入できるポリシー
CREATE POLICY "Users can insert own cardio logs"
  ON cardio_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ユーザーが自分のデータのみ更新できるポリシー
CREATE POLICY "Users can update own cardio logs"
  ON cardio_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- ユーザーが自分のデータのみ削除できるポリシー
CREATE POLICY "Users can delete own cardio logs"
  ON cardio_logs FOR DELETE
  USING (auth.uid() = user_id);

-- インデックスの作成（日付・ユーザー検索の高速化）
CREATE INDEX IF NOT EXISTS cardio_logs_user_id_idx ON cardio_logs (user_id);
CREATE INDEX IF NOT EXISTS cardio_logs_date_idx ON cardio_logs (date DESC);
CREATE INDEX IF NOT EXISTS cardio_logs_user_date_idx ON cardio_logs (user_id, date DESC);
