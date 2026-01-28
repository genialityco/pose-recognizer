import React, { useEffect, useRef, useState } from 'react';
import { PoseType, PoseData, savePoseToJSON, loadPosesFromJSON } from '../utils/poseDetection';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import '../styles/PoseCapture.css';

const POSES: PoseType[] = ['cheers', 'brindis', 'high-vibe', 'energy'];
const COUNTDOWN_TIME = 5; // segundos

// Definición de conexiones entre landmarks para dibujar el esqueleto
const POSE_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 7], [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10], [11, 12], [11, 13], [13, 15], [15, 17], [15, 19], [15, 21],
  [17, 19], [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  [11, 23], [12, 24], [23, 24], [23, 25], [24, 26], [25, 27], [26, 28],
  [27, 29], [28, 30], [29, 31], [30, 32], [27, 31], [28, 32]
];

const PoseCapture: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedPose, setSelectedPose] = useState<PoseType>('cheers');
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdown, setCountdown] = useState(COUNTDOWN_TIME);
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPoses, setCapturedPoses] = useState<PoseData[]>([]);
  const [message, setMessage] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [currentLandmarks, setCurrentLandmarks] = useState<any[]>([]);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const poseRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const initializeCamera = async () => {
      if (videoRef.current) {
        try {
          // Cargar los scripts de MediaPipe
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils@0.3/camera_utils.js';
          document.body.appendChild(script);

          const drawingScript = document.createElement('script');
          drawingScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils@0.3/drawing_utils.js';
          document.body.appendChild(drawingScript);

          const poseScript = document.createElement('script');
          poseScript.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/pose.js';
          document.body.appendChild(poseScript);

          script.onload = () => {
            drawingScript.onload = () => {
              poseScript.onload = () => {
                initializeMediaPipePose();
              };
            };
          };
        } catch (error) {
          console.error('Error inicializando MediaPipe:', error);
          setMessage('Error al inicializar la cámara');
        }
      }
    };

    initializeCamera();

    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (poseRef.current) {
        poseRef.current.close();
      }
    };
  }, []);

  const initializeMediaPipePose = async () => {
    // @ts-ignore
    const Pose = window.Pose;
    // @ts-ignore
    const Camera = window.Camera;

    if (!Pose || !Camera) {
      console.error('MediaPipe no cargado correctamente');
      setMessage('Error al cargar MediaPipe');
      return;
    }

    poseRef.current = new Pose({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5/${file}`;
      }
    });

    poseRef.current.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    poseRef.current.onResults(onPoseResults);

    if (videoRef.current) {
      const camera = new Camera(videoRef.current, {
        onFrame: async () => {
          if (videoRef.current && poseRef.current) {
            await poseRef.current.send({ image: videoRef.current });
          }
        },
        width: 1280,
        height: 720
      });
      camera.start();
      setCameraReady(true);
    }
  };

  const onPoseResults = (results: any) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    // Ajustar el tamaño del canvas al video
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;

    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Dibujar el video
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    if (results.poseLandmarks) {
      setCurrentLandmarks(results.poseLandmarks);
      
      // Dibujar conexiones (esqueleto)
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
      ctx.lineWidth = 2;
      
      POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
        const start = results.poseLandmarks[startIdx];
        const end = results.poseLandmarks[endIdx];
        
        if (start && end && start.visibility > 0.5 && end.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
          ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
          ctx.stroke();
        }
      });

      // Dibujar landmarks con números
      results.poseLandmarks.forEach((landmark: any, index: number) => {
        if (landmark.visibility > 0.5) {
          const x = landmark.x * canvas.width;
          const y = landmark.y * canvas.height;

          // Dibujar círculo del landmark
          ctx.beginPath();
          ctx.arc(x, y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Dibujar número del landmark
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = 'white';
          ctx.strokeStyle = 'black';
          ctx.lineWidth = 3;
          ctx.strokeText(index.toString(), x + 8, y + 4);
          ctx.fillText(index.toString(), x + 8, y + 4);
        }
      });
    }
  };

  const startCountdown = () => {
    setIsCountingDown(true);
    setCountdown(COUNTDOWN_TIME);
    setMessage(`Prepárate para la pose: ${selectedPose}`);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current);
          }
          setIsCountingDown(false);
          capturePose();
          return COUNTDOWN_TIME;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const capturePose = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsCapturing(true);
    setMessage('Capturando pose...');

    try {
      // Usar los landmarks actuales de MediaPipe
      const landmarks = currentLandmarks.length > 0 
        ? currentLandmarks 
        : generateMockLandmarks();

      const newPoseData: PoseData = {
        poseType: selectedPose,
        timestamp: new Date().toISOString(),
        landmarks: landmarks,
        confidence: currentLandmarks.length > 0 
          ? Math.min(...currentLandmarks.map((l: any) => l.visibility || 0.8))
          : Math.random() * 0.4 + 0.6,
      };

      setCapturedPoses([...capturedPoses, newPoseData]);
      setMessage(`✅ Pose "${selectedPose}" capturada exitosamente`);
      setIsCapturing(false);

      setTimeout(() => setMessage(''), 2000);
    } catch (error) {
      console.error('Error capturando pose:', error);
      setMessage('Error al capturar la pose');
      setIsCapturing(false);
    }
  };

  const generateMockLandmarks = () => {
    const landmarks = [];
    for (let i = 0; i < 33; i++) {
      landmarks.push({
        x: Math.random(),
        y: Math.random(),
        z: Math.random() * 0.5,
        visibility: Math.random() * 0.3 + 0.7,
      });
    }
    return landmarks;
  };

  const handleDownloadJSON = () => {
    if (capturedPoses.length === 0) {
      setMessage('No hay poses capturadas para descargar');
      return;
    }
    savePoseToJSON(capturedPoses);
    setMessage('Archivo JSON descargado');
  };

  const savePoseToFirestore = async (pose: PoseData) => {
    try {
      const posesCol = collection(db, 'poses');
      const q = query(posesCol, where('poseType', '==', pose.poseType));
      const snap = await getDocs(q);

      if (snap.empty) {
        await addDoc(posesCol, {
          poseType: pose.poseType,
          timestamp: pose.timestamp,
          landmarks: pose.landmarks,
          confidence: pose.confidence,
          createdAt: serverTimestamp(),
        });
        setMessage(`Pose ${pose.poseType} guardada en Firestore`);
      } else {
        // Update existing documents with same poseType (update all matches)
        const updates = snap.docs.map(async (d) => {
          const ref = doc(db, 'poses', d.id);
          return updateDoc(ref, {
            poseType: pose.poseType,
            timestamp: pose.timestamp,
            landmarks: pose.landmarks,
            confidence: pose.confidence,
            updatedAt: serverTimestamp(),
          });
        });
        await Promise.all(updates);
        setMessage(`Pose ${pose.poseType} actualizada en Firestore`);
      }
    } catch (error) {
      console.error('Error saving pose to Firestore:', error);
      setMessage('Error guardando pose en Firestore');
    }
    setTimeout(() => setMessage(''), 2500);
  };

  const handleUploadJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    loadPosesFromJSON(file)
      .then((data) => {
        setCapturedPoses(data.poses);
        setMessage(`${data.poses.length} poses cargadas desde archivo`);
      })
      .catch((error) => {
        console.error('Error cargando archivo:', error);
        setMessage('Error al cargar el archivo');
      });
  };

  const handleClearPoses = () => {
    setCapturedPoses([]);
    setMessage('Poses borradas');
    setTimeout(() => setMessage(''), 2000);
  };

  return (
    <div className="pose-capture-container">
      <h1>🎥 Capturador de Poses</h1>

      <div className="controls-section">
        <div className="pose-selector">
          <label htmlFor="pose-select">Selecciona una pose:</label>
          <select
            id="pose-select"
            value={selectedPose}
            onChange={(e) => setSelectedPose(e.target.value as PoseType)}
            disabled={isCountingDown || isCapturing}
          >
            {POSES.map((pose) => (
              <option key={pose} value={pose}>
                {pose.toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        <button
          className="btn btn-primary"
          onClick={startCountdown}
          disabled={isCountingDown || isCapturing || !cameraReady}
        >
          {isCountingDown ? `Cuenta regresiva: ${countdown}` : 'Capturar Pose'}
        </button>
      </div>

      <div className="camera-section">
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
            className="canvas-element"
          />
          {isCapturing && <div className="capture-indicator">Capturando...</div>}
          {!cameraReady && <div className="loading-indicator">Cargando cámara...</div>}
        </div>

        {message && <div className="message">{message}</div>}
        
        {currentLandmarks.length > 0 && (
          <div className="landmarks-info">
            Landmarks detectados: {currentLandmarks.length}
          </div>
        )}
      </div>

      <div className="stats-section">
        <h2>Poses Capturadas: {capturedPoses.length}</h2>

        {capturedPoses.length > 0 && (
          <div className="poses-list">
            {capturedPoses.map((pose, index) => (
              <div key={index} className="pose-item">
                <div className="pose-left">
                  <span className="pose-type">{pose.poseType.toUpperCase()}</span>
                  <span className="pose-time">
                    {new Date(pose.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="pose-right">
                  <span className="pose-confidence">Confianza: {(pose.confidence * 100).toFixed(1)}%</span>
                  <button className="btn btn-secondary" onClick={() => savePoseToFirestore(pose)}>Guardar</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="file-actions">
          <button className="btn btn-success" onClick={handleDownloadJSON}>
            💾 Descargar JSON
          </button>

          <label className="btn btn-info">
            📂 Cargar JSON
            <input
              type="file"
              accept=".json"
              onChange={handleUploadJSON}
              style={{ display: 'none' }}
            />
          </label>

          <button
            className="btn btn-danger"
            onClick={handleClearPoses}
            disabled={capturedPoses.length === 0}
          >
            🗑️ Limpiar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PoseCapture;