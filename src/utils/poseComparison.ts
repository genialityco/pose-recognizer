
export interface GameResult {
  round: number;
  poseType: string;
  playerScore: number;
  maxScore: number;
  accuracy: number;
  timestamp: string;
}

export interface GameResults {
  sessionId: string;
  totalRounds: number;
  finalScore: number;
  finalAccuracy: number;
  rounds: GameResult[];
  startTime: string;
  endTime: string;
}

// Calcular similaridad euclidiana entre dos landmarks (solo X e Y, sin Z)
const euclideanDistance2D = (p1: any, p2: any): number => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) +
    Math.pow(p1.y - p2.y, 2)
  );
};

// Comparar dos poses (solo landmarks del 11 al 23: torso y manos)
export const comparePoses = (
  capturedLandmarks: any[],
  referenceLandmarks: any[]
): number => {
  if (
    !capturedLandmarks ||
    !referenceLandmarks ||
    capturedLandmarks.length < 24 ||
    referenceLandmarks.length < 24
  ) {
    console.warn('[comparePoses] Landmarks insuficientes:', {
      captured: capturedLandmarks?.length,
      reference: referenceLandmarks?.length
    });
    return 0;
  }

  let totalWeightedDistance = 0;
  let totalWeight = 0;


  // Pesos: dar más importancia a brazos y manos
  const weightMap: Record<number, number> = {
    11: 2, // hombro izq
    12: 2, // hombro der
    13: 2, // codo izq
    14: 2, // codo der
    15: 2.5, // muñeca izq
    16: 2.5, // muñeca der
    17: 2, // pinky izq
    18: 2, // pinky der
    19: 2, // index izq
    20: 2, // index der
    21: 2, // pulgar izq
    22: 2, // pulgar der
    23: 0.8, // cadera izq (menos peso)
  };

  // Calcular peso total posible y preparar contador de peso detectado
  let totalWeightPossible = 0;
  for (let i = 11; i <= 23; i++) {
    totalWeightPossible += weightMap[i] ?? 1;
  }
  let detectedWeight = 0;

  // Solo comparar landmarks del 11 al 23 (torso y manos)
  for (let i = 11; i <= 23; i++) {
    const captured = capturedLandmarks[i];
    const reference = referenceLandmarks[i];
    const weight = weightMap[i] ?? 1;

    // Contabilizar peso detectado (según visibility del jugador)
    if (captured?.visibility > 0.3) {
      detectedWeight += weight;
    }

    // Solo comparar si ambos puntos tienen buena visibilidad
    if (captured?.visibility > 0.3 && reference?.visibility > 0.3) {
      const distance = euclideanDistance2D(captured, reference);
      totalWeightedDistance += distance * weight;
      totalWeight += weight;
    }
  }

  if (totalWeight === 0) {
    console.warn('[comparePoses] No hay puntos válidos para comparar');
    return 0;
  }

  const averageDistance = totalWeightedDistance / totalWeight;
  // Convertir distancia a porcentaje (distancia máxima esperada en 2D ~1.4)
  const baseAccuracy = Math.max(0, 1 - (averageDistance / 1.4));

  // Penalizar por cobertura insuficiente: si muchos puntos no se detectaron,
  // bajar el puntaje proporcionalmente. Mantener un mínimo (10%).
  const coverageRatio = totalWeightPossible > 0 ? detectedWeight / totalWeightPossible : 0;
  const MIN_COVERAGE = 0.1;
  const coverageFactor = Math.max(coverageRatio, MIN_COVERAGE);

  const adjustedAccuracy = baseAccuracy * coverageFactor;
  const result = Math.round(adjustedAccuracy * 100);
  
  console.log('[comparePoses]', {
    weightedPoints: totalWeight.toFixed(2),
    averageDistance: averageDistance.toFixed(3),
    baseAccuracy: Math.round(baseAccuracy * 100),
    coverageRatio: coverageRatio.toFixed(3),
    coverageFactor: coverageFactor.toFixed(3),
    adjustedAccuracy: result,
  });
  
  return result;
};

// Calcular confianza de la pose capturada
export const calculatePoseConfidence = (landmarks: any[]): number => {
  if (!landmarks || landmarks.length === 0) return 0;

  const visibleLandmarks = landmarks.filter((l: any) => l.visibility > 0.5);
  return (visibleLandmarks.length / landmarks.length) * 100;
};

// Generar ID único para sesión
export const generateSessionId = (): string => {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Guardar resultados del juego
export const saveGameResults = (results: GameResults): void => {
  const dataStr = JSON.stringify(results, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `game-results-${results.sessionId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Cargar resultados previos
export const loadGameResults = (file: File): Promise<GameResults> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = JSON.parse(e.target.result);
        resolve(data);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};
