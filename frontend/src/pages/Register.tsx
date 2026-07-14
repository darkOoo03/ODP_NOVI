import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { UserPlus, User, Mail, Key, Image, AlertCircle, CheckCircle, Info } from 'lucide-react';

const Register: React.FC = () => {
  const { registerUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Password validation checklist
  const [passChecks, setPassChecks] = useState({
    length: false,
    uppercase: false,
    number: false,
    match: false,
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setPassChecks({
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      number: /[0-9]/.test(password),
      match: password.length > 0 && password === confirmPassword,
    });
  }, [password, confirmPassword]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setError('Molimo izaberite ispravan fajl slike.');
        return;
      }
      setAvatar(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Pre-validations
    if (!username || !email || !password || !firstName || !lastName) {
      setError('Sva polja osim slike su obavezna.');
      return;
    }

    if (username.length < 3 || username.length > 40) {
      setError('Korisničko ime mora imati između 3 i 40 karaktera.');
      return;
    }

    if (!passChecks.length || !passChecks.uppercase || !passChecks.number) {
      setError('Lozinka ne ispunjava uslove (8+ karaktera, 1 veliko slovo, 1 broj).');
      return;
    }

    if (!passChecks.match) {
      setError('Lozinke se ne podudaraju.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('username', username.trim());
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('first_name', firstName.trim());
      formData.append('last_name', lastName.trim());
      if (avatar) {
        formData.append('avatar', avatar);
      }

      await registerUser(formData);
      setSuccess('Registracija uspešna! Preusmeravanje na prijavu...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Greška pri registraciji.');
      setLoading(false);
    }
  };

  return (
    <div className="register-container">
      <div className="register-card glass-panel animated slideUp">
        <div className="register-header">
          <div className="register-logo">
            <UserPlus size={28} />
          </div>
          <h2>Kreirajte nalog</h2>
          <p>Registrujte se kao pčelar za upravljanje vašim košnicama.</p>
        </div>

        {error && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {success && (
          <div className="alert alert-success">
            <CheckCircle size={18} />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="register-form" encType="multipart/form-data">
          <div className="form-row-2">
            <div className="form-group">
              <label htmlFor="first_name">Ime</label>
              <input
                id="first_name"
                type="text"
                className="form-control"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Ime"
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="last_name">Prezime</label>
              <input
                id="last_name"
                type="text"
                className="form-control"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Prezime"
                disabled={loading}
                required
              />
            </div>
          </div>

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
              placeholder="Min 3 karaktera"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">
              <Mail size={16} /> Email adresa
            </label>
            <input
              id="email"
              type="email"
              className="form-control"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="primer@email.com"
              disabled={loading}
              required
            />
          </div>

          <div className="form-row-2">
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
                placeholder="Min 8 karaktera"
                disabled={loading}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm_password">Potvrda lozinke</label>
              <input
                id="confirm_password"
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ponovite lozinku"
                disabled={loading}
                required
              />
            </div>
          </div>

          {/* Password Validation Display */}
          <div className="password-checklist">
            <p className="checklist-title">Uslovi za lozinku:</p>
            <ul>
              <li className={passChecks.length ? 'checked' : 'unchecked'}>
                <span className="dot" /> Minimum 8 karaktera
              </li>
              <li className={passChecks.uppercase ? 'checked' : 'unchecked'}>
                <span className="dot" /> Najmanje jedno veliko slovo
              </li>
              <li className={passChecks.number ? 'checked' : 'unchecked'}>
                <span className="dot" /> Najmanje jedan broj
              </li>
              <li className={passChecks.match ? 'checked' : 'unchecked'}>
                <span className="dot" /> Lozinke se podudaraju
              </li>
            </ul>
          </div>

          <div className="form-group avatar-upload-group">
            <label htmlFor="avatar-file">
              <Image size={16} /> Profilna slika (Opciono)
            </label>
            <div className="avatar-upload-container">
              <input
                id="avatar-file"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
                disabled={loading}
                className="file-input-hidden"
              />
              <label htmlFor="avatar-file" className="btn btn-outline btn-sm">
                Izaberi sliku
              </label>
              {avatarPreview ? (
                <div className="avatar-preview-box">
                  <img src={avatarPreview} alt="Avatar preview" />
                </div>
              ) : (
                <span className="no-avatar-selected">Nije izabrana slika</span>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Kreiranje naloga...' : 'Registruj se'}
          </button>
        </form>

        <div className="register-footer">
          Već imaš nalog? <Link to="/login">Prijavi se</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
