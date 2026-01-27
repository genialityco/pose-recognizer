# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:


  # Pose Recognizer Game

  Juego web en React + TypeScript para replicar poses usando MediaPipe.

  Características principales
  - Modo juego de 4 rondas con poses de ejemplo.
  - Detección de poses con MediaPipe (`@mediapipe/pose` + `@mediapipe/camera_utils`).
  - Entrada de nombre de jugador antes de jugar.
  - Guardado de resultados en `localStorage` (Top10) y exportación a JSON.
  - Script Node opcional (`tools/save_score.js`) para persistir scores en `data/scores.json` en el repositorio.

  ## Requisitos
  - Node.js >= 16
  - npm (o pnpm/yarn)
  - Navegador moderno con cámara y soporte de WebAssembly

  ## Instalación
  ```bash
  # desde la raíz del proyecto
  npm install
  # o si usas pnpm
  # pnpm install
  ```

  ## Desarrollo
  ```bash
  npm run dev
  ```
  Abrir en el navegador la URL que muestre Vite (normalmente http://localhost:5173).

  ## Construir para producción
  ```bash
  npm run build
  ```

  ## Uso
  - En la pantalla del menú, ingresa tu nombre en el campo "Nombre del jugador" y pulsa `JUGAR`.
  - El juego mostrará una pose, luego capturará tu pose con la cámara y te asignará una precisión y un puntaje.
  - Al finalizar, el resultado se guarda automáticamente en el Top10 dentro de `localStorage`.
  - Puedes exportar el Top10 desde el botón "Exportar Top10".

  ## Persistencia en disco (opcional)
  - El frontend guarda scores en `localStorage`. Si quieres guardar en un archivo dentro del repositorio, hay un script Node opcional:

  ```bash
  # desde la raíz del repo
  node tools/save_score.js "Nombre" 87 340
  ```
  - Esto crea/añade el registro a `data/scores.json`.

  ## Archivos relevantes
  - `src/components/PoseGame.tsx` — lógica del juego, entrada de nombre, guardado de highscores.
  - `src/utils/highscores.ts` — gestión de highscores en `localStorage`, obtención Top10 y exportación JSON.
  - `tools/save_score.js` — script Node para añadir scores a `data/scores.json`.
  - `data/scores.json` — fichero de ejemplo (creado vacío `[]`).
  - `src/components/PoseCapture.tsx` — componente de captura y canvas.

  ## Notas y solución de problemas
  - Asegúrate de dar permiso a la cámara en el navegador. El sitio debe servirse por `http`/`https` local; algunos navegadores requieren https para ciertas APIs.
  - Si falla la compilación por tipos relacionados con timers (por ejemplo `NodeJS.Timeout`), el código ya usa tipos compatibles con navegador (`ReturnType<typeof setInterval>`).
  - Si hay errores relacionados con MediaPipe o WASM, verifica que las dependencias estén instaladas:
    ```bash
    npm install @mediapipe/pose @mediapipe/camera_utils @mediapipe/tasks-vision
    ```
  - Para depurar detecciones, abre la consola del navegador: el juego imprime dumps de `playerLandmarks` y `referenceLandmarks` en cada ronda.

