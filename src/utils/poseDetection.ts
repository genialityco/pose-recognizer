export type PoseType = 'cheers' | 'brindis' | 'high-vibe' | 'energy';

export interface PoseData {
  poseType: PoseType;
  timestamp: string;
  landmarks: Array<{
    x: number;
    y: number;
    z: number;
    visibility: number;
  }>;
  confidence: number;
}

export interface PosesStorage {
  poses: PoseData[];
}

let camera: any;
let poseLandmarker: any;

export const initializeMediaPipe = async (videoElement: HTMLVideoElement) => {
  const visionModule = await import('@mediapipe/tasks-vision');
  const { FilesetResolver, PoseLandmarker } = visionModule as any;

  const vision = await FilesetResolver.forVisionAssets(
    'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
  );

  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/pose_landmarker.task`
    },
    runningMode: 'VIDEO',
    numPoses: 1,
  });

  const hasGetUserMedia = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  if (hasGetUserMedia()) {
    camera = new (window as any).Camera(videoElement, {
      onFrame: async () => {
        // This will be handled by the detection loop
      },
      width: 1280,
      height: 720,
    });
    camera.start();
  }

  return { camera, poseLandmarker };
};

export const detectPose = async (videoElement: HTMLVideoElement) => {
  if (!poseLandmarker) return null;

  const now = performance.now();
  const results = poseLandmarker.detectForVideo(videoElement, now);

  if (results.landmarks && results.landmarks.length > 0) {
    const landmarks = results.landmarks[0].map((landmark: any) => ({
      x: landmark.x,
      y: landmark.y,
      z: landmark.z,
      visibility: landmark.visibility,
    }));

    return {
      landmarks,
      confidence: calculateConfidence(landmarks),
    };
  }

  return null;
};

const calculateConfidence = (landmarks: any[]) => {
  const visibleLandmarks = landmarks.filter((l: any) => l.visibility > 0.5);
  return visibleLandmarks.length / landmarks.length;
};

export const getPoseKeyPoints = (landmarks: any[]) => {
  const keyPoints = {
    nose: landmarks[0],
    leftEye: landmarks[2],
    rightEye: landmarks[5],
    leftShoulder: landmarks[11],
    rightShoulder: landmarks[12],
    leftElbow: landmarks[13],
    rightElbow: landmarks[14],
    leftWrist: landmarks[15],
    rightWrist: landmarks[16],
    leftHip: landmarks[23],
    rightHip: landmarks[24],
  };
  return keyPoints;
};

export const savePoseToJSON = (poses: PoseData[]) => {
  const dataStr = JSON.stringify({ poses }, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `poses-${new Date().toISOString()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const loadPosesFromJSON = (file: File): Promise<PosesStorage> => {
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
