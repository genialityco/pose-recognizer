import { collection, addDoc, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface RemoteHighScore {
  id?: string;
  name: string;
  precision: number;
  score: number;
  date?: string;
}

const collectionRef = () => collection(db, 'highscores');

export async function saveScoreToFirestore(entry: RemoteHighScore): Promise<void> {
  try {
    await addDoc(collectionRef(), {
      name: entry.name,
      precision: entry.precision,
      score: entry.score,
      date: entry.date || new Date().toISOString(),
      createdAt: Timestamp.now(),
    });
  } catch (e) {
    console.warn('Error saving score to Firestore', e);
    throw e;
  }
}

export async function fetchTopScoresFromFirestore(limitN = 10): Promise<RemoteHighScore[]> {
  try {
    const q = query(collectionRef(), orderBy('precision', 'desc'), orderBy('score', 'desc'), limit(limitN));
    const snap = await getDocs(q);
    const out: RemoteHighScore[] = snap.docs.map((d) => {
      const data = d.data() as any;
      const dateField = data.date || (data.createdAt && (data.createdAt as Timestamp).toDate().toISOString());
      return {
        id: d.id,
        name: data.name || 'Jugador',
        precision: typeof data.precision === 'number' ? data.precision : Number(data.precision) || 0,
        score: typeof data.score === 'number' ? data.score : Number(data.score) || 0,
        date: dateField,
      };
    });
    return out;
  } catch (e) {
    console.warn('Error fetching top scores from Firestore', e);
    return [];
  }
}

export default {
  saveScoreToFirestore,
  fetchTopScoresFromFirestore,
};
