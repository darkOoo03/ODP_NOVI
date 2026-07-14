import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import api from '../services/api';
import { User, Mail, Shield, ShieldCheck, Box, Activity, Clipboard } from 'lucide-react';

interface ProfileStats {
  hives_count: number;
  queens_count: number;
  checks_count: number;
}

const Profile: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserStats = async () => {
      try {
        setLoading(true);
        // We can fetch system stats or filter by user, let's query a user-specific stats route
        // If we fetch dashboard summary it gives hives/queens count
        const response = await api.get('/dashboard/summary');
        setStats({
          hives_count: response.data.total_hives,
          queens_count: response.data.total_queens,
          checks_count: response.data.recent_checks.length // Just a mockup or let's count reviews from table
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserStats();
  }, []);

  const getAvatarUrl = (path: string | null) => {
    if (!path) return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y';
    return `http://localhost:5000${path}`;
  };

  return (
    <div className="profile-container">
      <div className="page-header-actions">
        <div>
          <h2>Moj Korisnički Profil</h2>
          <p>Pregled detalja vašeg beogradskog/pčelarskog naloga.</p>
        </div>
      </div>

      <div className="profile-layout-grid">
        {/* Profile Card */}
        <div className="profile-main-card card glass-panel animated fadeIn">
          <div className="profile-avatar-large">
            <img 
              src={getAvatarUrl(user?.avatar || null)} 
              onError={(e) => { (e.target as HTMLImageElement).src = 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=mp&f=y' }}
              alt="Avatar" 
            />
          </div>
          
          <div className="profile-user-details">
            <h3>{user?.first_name} {user?.last_name}</h3>
            <span className={`role-badge ${user?.role}`}>
              {user?.role === 'admin' ? 'Administrator' : 'Pčelar'}
            </span>

            <div className="profile-fields-list">
              <div className="profile-field-row">
                <User size={18} />
                <div className="field-data">
                  <span className="label">Korisničko ime</span>
                  <span className="value">@{user?.username}</span>
                </div>
              </div>

              <div className="profile-field-row">
                <Mail size={18} />
                <div className="field-data">
                  <span className="label">Email adresa</span>
                  <span className="value">{user?.email}</span>
                </div>
              </div>

              <div className="profile-field-row">
                <ShieldCheck size={18} />
                <div className="field-data">
                  <span className="label">Status naloga</span>
                  <span className="value text-success">Aktivan</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Apiary Stats Card */}
        <div className="profile-stats-card card glass-panel animated fadeIn">
          <h3>Statistika pčelinjaka</h3>
          <p>Ukupno unetih entiteta u vašem dnevniku.</p>

          {loading ? (
            <p>Učitavanje statistike...</p>
          ) : (
            <div className="profile-stats-grid">
              <div className="stats-box">
                <Box size={24} className="icon-green" />
                <span className="num">{stats?.hives_count}</span>
                <span className="lbl">Aktivnih košnica</span>
              </div>

              <div className="stats-box">
                <Activity size={24} className="icon-yellow" />
                <span className="num">{stats?.queens_count}</span>
                <span className="lbl">Unetih matica</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
