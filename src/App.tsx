import './App.css'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navigation from './components/Navigation'
import PoseGame from './components/PoseGame'
import PoseCapture from './components/PoseCapture'

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/" element={<PoseGame />} />
          <Route path="/pose-generate" element={<PoseCapture />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
