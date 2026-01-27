import React, { useEffect, useRef, useState } from 'react';
import { PoseType } from '../utils/poseDetection';
import {
  comparePoses,
  calculatePoseConfidence,
  generateSessionId,
  saveGameResults,
  GameResult,
  GameResults,
} from '../utils/poseComparison';
import {
  addScore as addHighScore,
  getTopScores,
  exportScoresJSON,
} from '../utils/highscores';
import cheersData from '../posesData/cheers.json';
import brindisData from '../posesData/brindis.json';
import highVibeData from '../posesData/high-vibe.json';
import energyData from '../posesData/energy.json';
import cheersPose from '../assets/poses/cheers.png';
import brindosPose from '../assets/poses/brindis.png';
import highVibePose from '../assets/poses/high-vibe.png';
import energyPose from '../assets/poses/energy.png';
import '../styles/PoseGame.css';

// Importar MediaPipe
import { Pose, Results } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

type GameState = 'menu' | 'showing-image' | 'capturing' | 'comparing' | 'result' | 'final-results';

const POSES: PoseType[] = ['cheers', 'brindis', 'high-vibe', 'energy'];
const TOTAL_ROUNDS = 4;
const IMAGE_SHOW_TIME = 1; // segundos
const CAPTURE_TIME = 3; // segundos

interface RoundData {
  poseType: PoseType;
  referenceData: any;
}

const getPoseData = (poseType: PoseType) => {
  switch (poseType) {
    case 'cheers':
      return cheersData;
    case 'brindis':
      return brindisData;
    case 'high-vibe':
      return highVibeData;
    case 'energy':
      return energyData;
  }
};

const getPoseImage = (poseType: PoseType): string => {
  switch (poseType) {
    case 'cheers':
      return cheersPose;
    case 'brindis':
      return brindosPose;
    case 'high-vibe':
      return highVibePose;
    case 'energy':
      return energyPose;
  }
};

const getReferenceLandmarks = (data: any): any[] => {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data.landmarks) return data.landmarks;
  if (data.default && data.default.landmarks) return data.default.landmarks;
  return [];
};

const PoseGame: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentRound, setCurrentRound] = useState(0);
  const [roundPoses, setRoundPoses] = useState<RoundData[]>([]);
  const [showImage, setShowImage] = useState(false);
  const [countdown, setCountdown] = useState(CAPTURE_TIME);
  const [currentScore, setCurrentScore] = useState(0);
  const [roundResults, setRoundResults] = useState<GameResult[]>([]);
  // cameraReady se eliminó porque no se utiliza
  const [sessionId] = useState(generateSessionId());
  const [gameSummary, setGameSummary] = useState<GameResults | null>(null);
  const [message, setMessage] = useState('');
  const [poseDetected, setPoseDetected] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [topScores, setTopScores] = useState<any[]>([]);

  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const roundIndexRef = useRef(0);
  const roundPosesRef = useRef<RoundData[]>([]);
  
  // Referencias para MediaPipe
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);
  const latestPoseLandmarksRef = useRef<any[] | null>(null);

  // Inicializar MediaPipe Pose una sola vez (no arrancar cámara aquí)
  useEffect(() => {
    let mounted = true;

    const initPoseOnce = async () => {
      try {
        const pose = new Pose({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
        });

        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          enableSegmentation: false,
          smoothSegmentation: false,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        pose.onResults(onPoseResults);
        if (mounted) poseRef.current = pose;
      } catch (error) {
        console.error('Error inicializando MediaPipe:', error);
        setMessage('Error al inicializar la detección de poses');
      }
    };

    initPoseOnce();

    return () => {
      mounted = false;
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (imageTimerRef.current) {
        clearTimeout(imageTimerRef.current);
      }
      if (cameraRef.current) {
        cameraRef.current.stop();
        cameraRef.current = null;
      }
      poseRef.current = null;
    };
  }, []);

  // Helpers para encender / apagar la cámara sin reinicializar Pose
  const startCamera = async () => {
    if (!videoRef.current) return;
    if (cameraRef.current) return; // ya iniciada
    if (!poseRef.current) return; // pose debe existir

    try {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720,
      });

      await camera.start();
      cameraRef.current = camera;
    } catch (error) {
      console.error('Error iniciando la cámara:', error);
      setMessage('Error al iniciar la cámara');
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (e) {
        console.warn('Error al detener la cámara', e);
      }
      cameraRef.current = null;
    }
  };

  // Encender/apagar cámara según gameState, sin reinicializar Pose
  useEffect(() => {
    if (gameState !== 'menu' && gameState !== 'final-results') {
      startCamera();
    } else {
      stopCamera();
    }
    // no queremos re-crear efectos por otros refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  // Callback cuando MediaPipe detecta una pose
  const onPoseResults = (results: Results) => {
    if (!canvasRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    // Limpiar canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

    // Dibujar la imagen del video
    if (results.image) {
      canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    // Guardar landmarks si se detectaron
    if (results.poseLandmarks) {
      latestPoseLandmarksRef.current = results.poseLandmarks;
      // Considerar detectada solo si alguna landmark tiene visibility alto
      const VISIBILITY_THRESHOLD = 0.3;
      const anyVisible = results.poseLandmarks.some((lm: any) => typeof lm.visibility === 'number' && lm.visibility >= VISIBILITY_THRESHOLD);
      setPoseDetected(Boolean(anyVisible));
    } else {
      latestPoseLandmarksRef.current = null;
      setPoseDetected(false);
    }

    canvasCtx.restore();
  };

  // Efecto para manejar el flujo de estados
  useEffect(() => {
    if (gameState === 'showing-image' && roundPosesRef.current.length > 0) {
      // Mostrar imagen por IMAGE_SHOW_TIME segundos
      const timer = setTimeout(() => {
        setShowImage(false);
        setGameState('capturing');
        startCapture();
      }, IMAGE_SHOW_TIME * 1000);

      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Efecto para manejar la captura con contador
  useEffect(() => {
    if (gameState === 'capturing') {
      setCountdown(CAPTURE_TIME);
      let remainingTime = CAPTURE_TIME;

      const interval = setInterval(() => {
        remainingTime -= 1;
        setCountdown(remainingTime);

        if (remainingTime <= 0) {
          clearInterval(interval);
          // Capturar y comparar
          captureAndCompare();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState]);

  const startGame = () => {
    if (!playerName || playerName.trim().length === 0) {
      setMessage('Por favor ingresa tu nombre antes de jugar');
      return;
    }
    // Barajar poses
    const shuffledPoses = [...POSES].sort(() => Math.random() - 0.5);
    const rounds: RoundData[] = shuffledPoses.slice(0, TOTAL_ROUNDS).map((pose) => ({
      poseType: pose,
      referenceData: getPoseData(pose),
    }));

    roundPosesRef.current = rounds;
    setRoundPoses(rounds);
    setCurrentRound(0);
    roundIndexRef.current = 0;
    setRoundResults([]);
    setCurrentScore(0);
    setShowImage(true);
    setGameState('showing-image');
  };

  const startCapture = () => {
    // Limpiar landmarks anteriores
    latestPoseLandmarksRef.current = null;
    setPoseDetected(false);
  };

  const captureAndCompare = async () => {
    setGameState('comparing');

    try {
      const rounds = roundPosesRef.current;
      const roundIndex = roundIndexRef.current;

      // Obtener landmarks del jugador desde MediaPipe (fallback a ceros si no hay detección)
      const normalizeLandmarks = (landmarks: any[] | null) => {
        const LEN = 33;
        const VISIBILITY_THRESHOLD = 0.3;
        const out = new Array(LEN).fill(null).map((_, i) => {
          const lm = landmarks && landmarks[i];
          const visible = lm && typeof lm.visibility === 'number' && lm.visibility >= VISIBILITY_THRESHOLD;
          if (visible && typeof lm.x === 'number' && typeof lm.y === 'number') {
            return {
              x: lm.x,
              y: lm.y,
              z: typeof lm.z === 'number' ? lm.z : 0,
              visibility: lm.visibility,
            };
          }
          return { x: 0, y: 0, z: 0, visibility: 0 };
        });
        return out;
      };

      // Normalizar preservando solo landmarks con visibility >= umbral
      let playerLandmarks = normalizeLandmarks(latestPoseLandmarksRef.current);

      // Si no había ninguna landmark con visibility suficiente, informar al usuario
      const anyDetected = Array.isArray(latestPoseLandmarksRef.current) && latestPoseLandmarksRef.current.some((lm: any) => typeof lm.visibility === 'number' && lm.visibility >= 0.3);
      if (!anyDetected) {
        console.warn('[PoseGame] No se detectaron landmarks con visibility >= 0.3; usando vector de ceros');
        setMessage('No se detectó pose: se registran valores 0');
      }

      const referenceData = rounds[roundIndex].referenceData;
      const referenceLandmarks = getReferenceLandmarks(referenceData);

      // Comparar poses
      const accuracy = comparePoses(playerLandmarks, referenceLandmarks);
      const confidence = calculatePoseConfidence(playerLandmarks);

      // Debug: imprimir data para diagnóstico
      console.log('[PoseGame][DEBUG] Ronda', roundIndex + 1, {
        poseType: rounds[roundIndex].poseType,
        accuracy,
        confidence,
        playerLandmarksCount: playerLandmarks.length,
        referenceLandmarksCount: referenceLandmarks.length,
        playerLandmarks,
        referenceLandmarks,
      });

      // Crear resultado de la ronda
      const roundResult: GameResult = {
        round: roundIndex + 1,
        poseType: rounds[roundIndex].poseType,
        playerScore: accuracy,
        maxScore: 100,
        accuracy: accuracy,
        timestamp: new Date().toISOString(),
      };

      const newResults = [...roundResults, roundResult];
      setRoundResults(newResults);
      setCurrentScore(currentScore + accuracy);

      setGameState('result');
      setMessage(`Precisión: ${accuracy}% - Confianza: ${confidence.toFixed(1)}%`);

      // Esperar 2 segundos antes de pasar a la siguiente ronda
      setTimeout(() => {
        if (roundIndex + 1 < rounds.length) {
          roundIndexRef.current = roundIndex + 1;
          setCurrentRound(roundIndex + 1);
          setShowImage(true);
          setGameState('showing-image');
        } else {
          endGame(newResults);
        }
      }, 2000);
    } catch (error) {
      console.error('Error comparando poses:', error);
      setMessage('Error al procesar la pose');
    }
  };

  const endGame = (results: GameResult[]) => {
    const finalAccuracy = results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length)
      : 0;

    const summary: GameResults = {
      sessionId,
      totalRounds: results.length,
      finalScore: results.reduce((sum, r) => sum + r.playerScore, 0),
      finalAccuracy,
      rounds: results,
      startTime: new Date(Date.now() - results.length * 5000).toISOString(), // Aproximado
      endTime: new Date().toISOString(),
    };

    setGameSummary(summary);
    setGameState('final-results');
    saveGameResults(summary);
    // Guardar en highscores (localStorage)
    try {
      addHighScore({
        name: playerName || 'Jugador',
        precision: summary.finalAccuracy,
        score: summary.finalScore,
        date: new Date().toISOString(),
      });
      setTopScores(getTopScores(10));
    } catch (e) {
      console.warn('No se pudo guardar highscore:', e);
    }
  };

  const handleDownloadResults = () => {
    if (gameSummary) {
      saveGameResults(gameSummary);
      setMessage('Resultados descargados');
    }
  };

  const handlePlayAgain = () => {
    setGameState('menu');
    setShowImage(false);
    setCountdown(CAPTURE_TIME);
    setCurrentScore(0);
    setRoundResults([]);
    setGameSummary(null);
    setMessage('');
    latestPoseLandmarksRef.current = null;
    setPoseDetected(false);
  };

  return (
    <div className="pose-game-container">
      {gameState === 'menu' && (
        <div className="menu-section">
          <h1>Juego de Poses</h1>
          <p className="subtitle">Replique las poses mostradas en pantalla.</p>

          <div className="player-name-input">
            <label htmlFor="playerName">Nombre del jugador</label>
            <input
              id="playerName"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          <div className="game-info">
            <div className="info-card">
              <span className="info-title">Rondas</span>
              <span className="info-value">{TOTAL_ROUNDS}</span>
            </div>
            <div className="info-card">
              <span className="info-title">Tiempo por Pose</span>
              <span className="info-value">{IMAGE_SHOW_TIME}s</span>
            </div>
            <div className="info-card">
              <span className="info-title">Tiempo de Captura</span>
              <span className="info-value">{CAPTURE_TIME}s</span>
            </div>
          </div>

          <button className="btn btn-play" onClick={startGame}>
            JUGAR
          </button>

          <div className="highscores-preview">
            <h3>Top 10 Mejores Puntajes</h3>
            <ol>
              {getTopScores(10).map((s, i) => (
                <li key={i}>{s.name} — Precisión: {s.precision}% — Puntos: {s.score}</li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {gameState !== 'menu' && gameState !== 'final-results' && (
        <div className="game-section">
          <div className="round-info">
            <span className="round-number">Ronda {currentRound + 1}/{TOTAL_ROUNDS}</span>
            <span className="current-score">Puntos: {currentScore}</span>
            {!showImage && (
              <span className={`pose-status ${poseDetected ? 'detected' : 'not-detected'}`}>
                {poseDetected ? 'Pose detectada' : 'Sin detección'}
              </span>
            )}
          </div>

          <div className="game-content">
            <div className="pose-image-section" style={{ display: showImage ? 'block' : 'none' }}>
                <h2>Replique esta pose:</h2>
              <img
                ref={imageRef}
                src={getPoseImage(roundPoses[currentRound]?.poseType)}
                alt={roundPoses[currentRound]?.poseType}
                className="pose-image"
              />
            </div>

            <div className="camera-section" style={{ display: showImage ? 'none' : 'block' }}>
              <div className="video-container">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="video-element"
                  style={{ display: 'none' }}
                />
                <canvas
                  ref={canvasRef}
                  width={1280}
                  height={720}
                  className="video-element"
                />
                {gameState === 'capturing' && (
                  <div className="overlay">
                    <div className="countdown-timer">{countdown}</div>
                    <p className="instruction">Haz la pose ahora</p>
                  </div>
                )}
                {gameState === 'comparing' && (
                  <div className="overlay processing">
                    <div className="spinner"></div>
                    <p>Analizando pose...</p>
                  </div>
                )}
                {gameState === 'result' && message && (
                  <div className="overlay result">
                    <p className="result-text">{message}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {gameState === 'final-results' && gameSummary && (
        <div className="results-section">
          <h1>Resultados finales</h1>

          <div className="final-score-card">
            <div className="score-display">
              <span className="final-accuracy">{gameSummary.finalAccuracy}%</span>
              <span className="score-label">Precisión Final</span>
            </div>
            <div className="score-stats">
              <div className="stat">
                <span className="stat-label">Rondas Completadas</span>
                <span className="stat-value">{gameSummary.totalRounds}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Puntos Totales</span>
                <span className="stat-value">{gameSummary.finalScore}</span>
              </div>
            </div>
          </div>

          <div className="rounds-detail">
            <h2>Detalles por Ronda</h2>
            <div className="rounds-list">
              {gameSummary.rounds.map((round, index) => (
                <div key={index} className="round-detail-item">
                  <span className="round-num">Ronda {round.round}</span>
                  <span className="round-pose">{round.poseType.toUpperCase()}</span>
                  <span className="round-accuracy">{round.accuracy}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={handlePlayAgain}>
              Jugar de nuevo
            </button>
            <button className="btn btn-success" onClick={handleDownloadResults}>
              Descargar resultados
            </button>
            <button
              className="btn btn-export"
              onClick={() => {
                try {
                  exportScoresJSON();
                  setMessage('Top scores exportados');
                } catch (e) {
                  console.warn(e);
                }
              }}
            >
              Exportar Top10
            </button>
          </div>

          <div className="highscores-list">
            <h2>Top 10 Mejores Puntajes</h2>
            <ol>
              {getTopScores(10).map((s, i) => (
                <li key={i}>{s.name} — Precisión: {s.precision}% — Puntos: {s.score}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
};

export default PoseGame;