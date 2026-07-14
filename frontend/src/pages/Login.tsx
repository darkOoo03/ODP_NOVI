import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LogIn, Key, User, AlertCircle } from 'lucide-react';

const Login: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  // Check if redirected due to expired session
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('expired') === 'true') {
      setSessionExpired(true);
    }
  }, [location]);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!username.trim() || !password.trim()) {
      setError('Korisničko ime i lozinka su obavezni.');
      setLoading(false);
      return;
    }

    try {
      await login(username.trim(), password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Greška pri prijavi. Proverite podatke.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card glass-panel animated slideUp">
        <div className="login-header">
          <div className="login-logo">
            <LogIn size={28} />
          </div>
          <h2>Prijava na sistem</h2>
          <p>Unesite kredencijale za pristup vašem pčelinjaku.</p>
        </div>

        {sessionExpired && (
          <div className="alert alert-info">
            <AlertCircle size={18} />
            Vaša sesija je istekla. Molimo prijavite se ponovo.
          </div>
        )}

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">
              <User size={16} /> Korisničko ime
            </label>
            <input
              id="username"
              type="text"
              className="form-control"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Unesite korisničko ime"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">
              <Key size={16} /> Lozinka
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Unesite lozinku"
              disabled={loading}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Prijavljivanje...' : 'Prijavi se'}
          </button>
        </form>

        <div className="login-footer">
          Nemaš nalog? <Link to="/register">Registruj se</Link>
          <div className="guide-shortcut">
            <Link to="/guide">Otvori vodič za boje</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
