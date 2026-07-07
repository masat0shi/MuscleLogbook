/** 日本時間の深夜3時を1日の区切りとした「今日」の日付(YYYY-MM-DD)を返す */
export function getLogicalToday(): string {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const jst = new Date(utcMs + 9 * 60 * 60000);
  jst.setHours(jst.getHours() - 3);

  const y = jst.getFullYear();
  const m = String(jst.getMonth() + 1).padStart(2, '0');
  const d = String(jst.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
