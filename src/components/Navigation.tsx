import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/Navigation.css';

const Navigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="navigation">
      <div className="nav-container">
        <div className="nav-logo" onClick={() => navigate('/')}>
          Pose Recognizer
        </div>
        
        <ul className="nav-menu">
          <li className="nav-item">
            <button
              className={`nav-link ${location.pathname === '/' ? 'active' : ''}`}
              onClick={() => navigate('/')}
            >
              Jugar
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${location.pathname === '/pose-generate' ? 'active' : ''}`}
              onClick={() => navigate('/pose-generate')}
            >
              Generar Poses
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
};

export default Navigation;
