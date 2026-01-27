# 🎮 Pose Recognizer Game

Un juego interactivo para capturar y reconocer poses usando MediaPipe y React TypeScript.

## ✨ Características

### 🎯 Página Principal - Juego de Poses
- Muestra imágenes de poses durante 1 segundo
- El jugador dispone de 3 segundos para replicar la pose
- Comparación automática de poses usando landmarks
- Cálculo de precisión en tiempo real
- 4 poses diferentes: Cheers, Brindis, High-Vibe, Energy
- Descarga de resultados en JSON

### ➕ Página de Generación de Poses
- Captura de poses en tiempo real desde la cámara
- Selector de pose a capturar
- Contador regresivo de 5 segundos antes de capturar
- Almacenamiento de datos de landmarks en JSON
- Carga y descarga de archivos JSON

## 🚀 Instalación

```bash
# Instalar dependencias
npm install

# Ejecutar en desarrollo
npm run dev

# Build para producción
npm run build
```

## 📂 Estructura del Proyecto

```
src/
├── components/
│   ├── PoseGame.tsx         # Componente principal del juego
│   ├── PoseCapture.tsx      # Captura de poses
│   └── Navigation.tsx       # Navegación
├── utils/
│   ├── poseDetection.ts     # Utilidades de detección con MediaPipe
│   └── poseComparison.ts    # Lógica de comparación de poses
├── posesData/
│   ├── cheers.json
│   ├── brindis.json
│   ├── high-vibe.json
│   └── energy.json
├── assets/poses/            # Imágenes de referencia
└── styles/                  # Estilos CSS
```

## 🎮 Cómo Jugar

1. **Accede a la página principal** (`http://localhost:5173/`)
2. **Haz clic en "JUGAR"** para iniciar
3. **Observa la imagen** de la pose durante 1 segundo
4. **Replica la pose** durante los 3 segundos de captura
5. **Ve tu puntaje** al finalizar cada ronda
6. **Descarga los resultados** en JSON al terminar

## 📊 Generar Nuevas Poses

1. **Dirígete a "Generar Poses"** (`http://localhost:5173/pose-generate`)
2. **Selecciona la pose** que quieres capturar
3. **Presiona "Capturar Pose"**
4. **Realiza la pose** durante el contador regresivo
5. **Descarga el JSON** con los datos capturados
6. **Carga archivos JSON** previos si lo necesitas

## 🔧 Tecnologías Utilizadas

- **React 19** - Framework UI
- **TypeScript** - Lenguaje tipado
- **Vite** - Build tool moderno
- **MediaPipe** - Detección de poses
- **React Router** - Navegación
- **CSS3** - Estilos con gradientes y animaciones

## 📊 Formato de Datos

### Estructura de Pose
```json
{
  "poseType": "cheers",
  "timestamp": "2026-01-27T13:15:00.292Z",
  "landmarks": [
    {
      "x": 0.204,
      "y": 0.228,
      "z": 0.476,
      "visibility": 0.848
    }
  ],
  "confidence": 0.978
}
```

### Estructura de Resultados del Juego
```json
{
  "sessionId": "session-xxx",
  "totalRounds": 4,
  "finalScore": 285,
  "finalAccuracy": 71,
  "rounds": [
    {
      "round": 1,
      "poseType": "cheers",
      "playerScore": 75,
      "accuracy": 75,
      "timestamp": "2026-01-27T..."
    }
  ],
  "startTime": "2026-01-27T...",
  "endTime": "2026-01-27T..."
}
```

## 🎨 Personalización

### Cambiar número de rondas
Edita `PoseGame.tsx`:
```typescript
const TOTAL_ROUNDS = 4; // Cambia a tu valor
```

### Ajustar tiempos
```typescript
const IMAGE_SHOW_TIME = 1;  // Segundos mostrando imagen
const CAPTURE_TIME = 3;      // Segundos para capturar
```

## 🐛 Solución de Problemas

**Error de permisos de cámara:**
- Asegúrate de permitir el acceso a la cámara en tu navegador
- Intenta en incógnito si persiste

**Las poses no se capturan correctamente:**
- Asegúrate de tener buena iluminación
- Posiciónate de frente a la cámara
- Verifica que MediaPipe esté cargado correctamente

## 📝 Licencia

MIT

---

Hecho con ❤️ para reconocimiento de poses
