import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Applications from './pages/Applications';
import './App.css';

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc' }}>
          <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
          <Link to="/register" style={{ marginRight: '1rem' }}>Register</Link>
          <Link to="/dashboard" style={{ marginRight: '1rem' }}>Dashboard</Link>
          <Link to="/applications" style={{ marginRight: '1rem' }}>Applications</Link>
        </nav>

        <div style={{ padding: '2rem' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/applications" element={<Applications />} />
            <Route path="/" element={
              <div>
                <h1>ScholarshipHub</h1>
                <p>Welcome to ScholarshipHub - Your scholarship tracking system</p>
                <p>Navigate using the links above</p>
              </div>
            } />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;
