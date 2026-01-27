export interface HighScore {
  name: string;
  precision: number; // finalAccuracy
  score: number; // finalScore
  date: string;
}

const STORAGE_KEY = 'pose_highscores_v1';

export function getScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HighScore[];
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.warn('Error leyendo highscores:', e);
    return [];
  }
}

export function saveScores(scores: HighScore[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch (e) {
    console.warn('Error guardando highscores:', e);
  }
}

export function addScore(entry: HighScore) {
  const scores = getScores();
  scores.push(entry);
  // Ordenar por precision desc, luego score desc
  scores.sort((a, b) => {
    if (b.precision !== a.precision) return b.precision - a.precision;
    return b.score - a.score;
  });
  // Mantener solo top 100 para almacenamiento
  const truncated = scores.slice(0, 100);
  saveScores(truncated);
}

export function getTopScores(limit = 10): HighScore[] {
  return getScores().slice(0, limit);
}

export function exportScoresJSON(filename = 'pose_highscores.json') {
  try {
    const data = JSON.stringify(getScores(), null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) {
    console.warn('Error exportando highscores:', e);
  }
}

export default {
  getScores,
  addScore,
  getTopScores,
  exportScoresJSON,
};
