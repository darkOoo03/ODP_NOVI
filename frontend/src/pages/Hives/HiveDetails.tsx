import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Box, 
  MapPin, 
  Layers, 
  Activity, 
  Calendar, 
  Clipboard, 
  History, 
  Plus, 
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  HelpCircle
} from 'lucide-react';

interface ActiveQueen {
  id: number;
  queen_code: string;
  assignment_id: number;
  assigned_at: string;
}

interface AssignmentLog {
  assignment_id: number;
  assigned_at: string;
  ended_at: string | null;
  assignment_status: 'aktivna' | 'zavrsena';
  assignment_note: string | null;
  queen_code: string;
  queen_id: number;
  marking_color: string;
}

interface QualityCheck {
  id: number;
  check_date: string;
  is_queen_seen: number;
  are_eggs_seen: number;
  brood_score: number;
  laying_score: number;
  temperament_score: number;
  productivity_score: number;
  health_score: number;
  total_score: string;
  recommendation: string;
  note: string | null;
  checked_by_username: string;
}

interface HiveDetail {
  id: number;
  code: string;
  hive_type_id: number;
  hive_type_name: string;
  apiary_name: string;
  location: string;
  note: string | null;
  active_queen: ActiveQueen | null;
  assignments_history: AssignmentLog[];
  active_queen_checks: QualityCheck[];
}

const HiveDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [hive, setHive] = useState<HiveDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchHiveDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/hive/${id}`);
      setHive(response.data);
    } catch (err) {
      console.error(err);
      setError('Košnica nije pronađena.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchHiveDetails();
    }
  }, [id]);

  const getRecommendationLabel = (rec: string) => {
    const map: Record<string, string> = {
      zadrzati: 'Zadržati',
      pratiti: 'Pratiti',
      zameniti: 'Zameniti',
      hitno_zameniti: 'Hitno zameniti',
      dodati_novu: 'Dodati novu'
    };
    return map[rec] || rec;
  };

  const getRecommendationBadgeClass = (rec: string) => {
    const map: Record<string, string> = {
      zadrzati: 'badge badge-success',
      pratiti: 'badge badge-warning',
      zameniti: 'badge badge-danger',
      hitno_zameniti: 'badge badge-danger-dark',
      dodati_novu: 'badge badge-info'
    };
    return map[rec] || 'badge';
  };

  if (loading) return <div className="loading-state">Učitavanje detalja košnice...</div>;
  if (error || !hive) return <div className="error-state">{error || 'Podaci nedostupni.'}</div>;

  return (
    <div className="hive-details-container">
      <div className="back-link">
        <Link to="/hives" className="btn btn-text">
          <ArrowLeft size={16} /> Nazad na listu košnica
        </Link>
      </div>

      {/* Header and overview */}
      <div className="details-header-card glass-panel animated fadeIn">
        <div className="header-meta-icon">
          <Box size={40} />
        </div>
        <div className="header-meta-text">
          <h2>Košnica: {hive.code}</h2>
          <p className="hive-type-tag">{hive.hive_type_name}</p>
        </div>
      </div>

      <div className="details-layout-grid">
        {/* Left Side: Info cards */}
        <div className="details-left-panel">
          
          {/* General info */}
          <div className="details-card card glass-panel">
            <h3>Osnovni podaci</h3>
            <div className="details-fields">
              <div className="detail-field">
                <span className="field-label">Pčelinjak:</span>
                <span className="field-value">{hive.apiary_name}</span>
              </div>
              <div className="detail-field">
                <span className="field-label">Lokacija:</span>
                <span className="field-value">
                  <MapPin size={14} /> {hive.location}
                </span>
              </div>
              {hive.note && (
                <div className="detail-field note-field">
                  <span className="field-label">Napomena:</span>
                  <p className="field-value note-text">{hive.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Active Queen card */}
          <div className="details-card card glass-panel">
            <h3>Aktivna matica</h3>
            {hive.active_queen ? (
              <div className="active-queen-box">
                <p className="active-queen-code">
                  Oznaka: <Link to={`/queens/${hive.active_queen.id}`}><strong>{hive.active_queen.queen_code}</strong></Link>
                </p>
                <p className="active-queen-date">
                  Dodeljena: <strong>{new Date(hive.active_queen.assigned_at).toLocaleDateString('sr-RS')}</strong>
                </p>
                <div className="active-queen-actions">
                  <Link 
                    to={`/quality-checks?assignment_id=${hive.active_queen.assignment_id}`} 
                    className="btn btn-outline btn-sm btn-block"
                  >
                    <Clipboard size={14} /> Svi pregledi matice
                  </Link>
                </div>
              </div>
            ) : (
              <div className="no-active-queen-box">
                <p className="warning-text">Košnica trenutno nema aktivnu maticu.</p>
                <Link to="/assignments" className="btn btn-primary btn-sm btn-block">
                  <Plus size={14} /> Dodeli maticu
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quality Checks and Assignment History */}
        <div className="details-right-panel">
          
          {/* Active queen checks */}
          {hive.active_queen && (
            <div className="details-card card glass-panel">
              <div className="card-header-actions">
                <h3>Nedavne ocene kvaliteta</h3>
                <Link 
                  to={`/quality-checks/new?assignment_id=${hive.active_queen.assignment_id}`}
                  className="btn btn-primary btn-xs"
                >
                  <Plus size={14} /> Oceni maticu
                </Link>
              </div>

              {hive.active_queen_checks.length === 0 ? (
                <p className="empty-text">Još uvek nema unetih pregleda za trenutnu maticu.</p>
              ) : (
                <div className="checks-timeline">
                  {hive.active_queen_checks.map((check) => (
                    <div key={check.id} className="timeline-item">
                      <div className="timeline-header">
                        <span className="timeline-date">
                          <Calendar size={14} /> {new Date(check.check_date).toLocaleDateString('sr-RS')}
                        </span>
                        <span className={getRecommendationBadgeClass(check.recommendation)}>
                          {getRecommendationLabel(check.recommendation)}
                        </span>
                      </div>
                      <div className="timeline-body">
                        <div className="score-summary-row">
                          <span className="score-main">
                            <Star size={16} className="icon-gold" /> <strong>{check.total_score}</strong>
                          </span>
                          <div className="seen-indicators">
                            <span className={`indicator ${check.is_queen_seen ? 'seen' : 'unseen'}`}>
                              Matica: {check.is_queen_seen ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            </span>
                            <span className={`indicator ${check.are_eggs_seen ? 'seen' : 'unseen'}`}>
                              Jaja: {check.are_eggs_seen ? <CheckCircle size={12} /> : <XCircle size={12} />}
                            </span>
                          </div>
                        </div>

                        <div className="subscores-grid">
                          <span>Leglo: <strong>{check.brood_score}</strong></span>
                          <span>Zaleganje: <strong>{check.laying_score}</strong></span>
                          <span>Mirnoća: <strong>{check.temperament_score}</strong></span>
                          <span>Prinos: <strong>{check.productivity_score}</strong></span>
                          <span>Zdravlje: <strong>{check.health_score}</strong></span>
                        </div>

                        {check.note && <p className="check-note-text">"{check.note}"</p>}
                        <span className="checked-by-label">Pregledao: {check.checked_by_username}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Queen Assignment History */}
          <div className="details-card card glass-panel">
            <h3>
              <History size={18} /> Istorijat matica u košnici
            </h3>
            {hive.assignments_history.length === 0 ? (
              <p className="empty-text">U ovoj košnici još uvek nije bilo dodeljenih matica.</p>
            ) : (
              <div className="assignment-history-list">
                {hive.assignments_history.map((log) => (
                  <div key={log.assignment_id} className="history-row-card">
                    <div className="history-row-main">
                      <div className="queen-info-badges">
                        <span 
                          className="color-dot" 
                          style={{ 
                            backgroundColor: log.marking_color === 'bela' ? '#ffffff' :
                                             log.marking_color === 'zuta' ? '#fbbf24' :
                                             log.marking_color === 'crvena' ? '#ef4444' :
                                             log.marking_color === 'zelena' ? '#10b981' :
                                             log.marking_color === 'plava' ? '#3b82f6' : '#d1d5db',
                            border: log.marking_color === 'bela' ? '1px solid #9ca3af' : 'none'
                          }}
                        />
                        <Link to={`/queens/${log.queen_id}`}><strong>{log.queen_code}</strong></Link>
                      </div>
                      <div className="assignment-period">
                        <span>Od: {new Date(log.assigned_at).toLocaleDateString('sr-RS')}</span>
                        <span>Do: {log.ended_at ? new Date(log.ended_at).toLocaleDateString('sr-RS') : 'Sada (Aktivna)'}</span>
                      </div>
                    </div>
                    {log.assignment_note && (
                      <p className="assignment-note-text">Napomena: {log.assignment_note}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default HiveDetails;
