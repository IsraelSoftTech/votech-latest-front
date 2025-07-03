import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { NavigationProvider } from './context/NavigationContext';
import { YearProvider } from './context/YearContext';
import Welcome from './components/Welcome';
import Login from './components/Login.jsx';
import Account from './components/Account.jsx';
import Dash from './components/Dash';
import Students from './components/Students';
import Classes from './components/Classes';
import Vocational from './components/Vocational';
import Teachers from './components/Teachers';
import Fees from './components/Fees';
import IdCard from './components/IdCard';
import Home from './components/Home';
import UserDash from './components/UserDash';
import UserReg from './components/UserReg';

// Simple JWT decode utility (no external lib needed for payload)
function getRoleFromToken() {
  const token = sessionStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role;
  } catch {
    return null;
  }
}

function RequireRole({ role, children }) {
  const userRole = getRoleFromToken();
  const location = useLocation();
  if (!userRole) return <Navigate to="/login" state={{ from: location }} replace />;
  if (userRole !== role) {
    // Redirect to appropriate dashboard
    if (userRole === 'admin') return <Navigate to="/dashboard" replace />;
    if (userRole === 'user') return <Navigate to="/user-dashboard" replace />;
    return <Navigate to="/login" replace />;
  }
  return children;
}

function App() {
  const [showWelcome, setShowWelcome] = useState(true);

  if (showWelcome) {
    return <Welcome onComplete={() => setShowWelcome(false)} />;
  }

  return (
    <Router>
      <YearProvider>
        <NavigationProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/account" element={<Account />} />
            {/* Admin routes */}
            <Route path="/dashboard" element={<RequireRole role="admin"><Dash /></RequireRole>} />
            <Route path="/students" element={<RequireRole role="admin"><Students /></RequireRole>} />
            <Route path="/classes" element={<RequireRole role="admin"><Classes /></RequireRole>} />
            <Route path="/vocational" element={<RequireRole role="admin"><Vocational /></RequireRole>} />
            <Route path="/teachers" element={<RequireRole role="admin"><Teachers /></RequireRole>} />
            <Route path="/fees" element={<RequireRole role="admin"><Fees /></RequireRole>} />
            <Route path="/id-cards" element={<RequireRole role="admin"><IdCard /></RequireRole>} />
            {/* User routes */}
            <Route path="/user-dashboard" element={<RequireRole role="user"><UserDash /></RequireRole>} />
            <Route path="/user-registration" element={<RequireRole role="user"><UserReg /></RequireRole>} />
            {/* Fallback: redirect unknown routes to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NavigationProvider>
      </YearProvider>
    </Router>
  );
}

export default App;
