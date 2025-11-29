import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { useAuth } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import './App.css';

function App() {
  const { user } = useAuth();

  return (
    <BrowserRouter future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
      <div className="app">
        <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
          {!user && (
            <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
          )}
          <Link to="/dashboard" style={{ marginRight: '1rem' }}>Dashboard</Link>
          <Link to="/applications" style={{ marginRight: '1rem' }}>Applications</Link>
        </nav>

        <div style={{ padding: '2rem' }}>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/applications"
              element={
                <ProtectedRoute>
                  <Applications />
                </ProtectedRoute>
              }
            />

            {/* Root route */}
            <Route
              path="/"
              element={
                <div>
                  <h1>ScholarshipHub</h1>
                  <p>Welcome to ScholarshipHub - Your scholarship tracking system</p>
                  <p>Navigate using the links above</p>
                </div>
              }
            />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
