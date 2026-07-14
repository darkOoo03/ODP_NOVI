import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { 
  Activity, 
  MapPin, 
  Calendar, 
  Clipboard, 
  History, 
  Plus, 
  ArrowLeft,
  Star,
  CheckCircle,
  XCircle,
  TrendingUp,
  Sparkles,
  Box
} from 'lucide-react';

interface CurrentHive {
  id: number;
  code: string;
  apiary_name: string;
  location: string;
  assignment_id: number;
  assigned_at: string;
}

interface AssignmentLog {
  assignment_id: number;
  assigned_at: string;
  ended_at: string | null;
  assignment_status: 'aktivna' | 'zavrsena';
  assignment_note: string | null;
  hive_code: string;
  hive_id: number;
  apiary_name: string;
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
  hive_code: string;
}

interface QueenDetail {
  id: number;
  queen_code: string;
  breed_id: number;
  breed_name: string;
  birth_year: number;
  marking_color: string;
  origin: string;
  status: string;
  note: string | null;
  age_years: number;
  current_hive: CurrentHive | null;
  average_score: string | null;
  assignments_history: AssignmentLog[];
  quality_checks_history: QualityCheck[];
  last_recommendation: string | null;
}

const QueenDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [queen, setQueen] = useState<QueenDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchQueenDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/queens/${id}`);
      setQueen(response.data);
    } catch (err) {
      console.error(err);
      setError('Matica nije pronađena.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchQueenDetails();
    }
  }, [id]);

  const getRecommendationLabel = (rec: string | null) => {
    if (!rec) return '-';
    const map: Record<string, string> = {
      zadrzati: 'Zadržati',
      pratiti: 'Pratiti',
      zameniti: 'Zameniti',
      hitno_zameniti: 'Hitno zameniti',
      dodati_novu: 'Dodati novu'
    };
    return map[rec] || rec;
  };

  const getRecommendationBadgeClass = (rec: string | null) => {
    if (!rec) return 'badge';
    const map: Record<string, string> = {
      zadrzati: 'badge badge-success',
      pratiti: 'badge badge-warning',
      zameniti: 'badge badge-danger',
      hitno_zameniti: 'badge badge-danger-dark',
      dodati_novu: 'badge badge-info'
    };
    return map[rec] || 'badge';
  };

  const getColorLabel = (c: string) => {
    const map: Record<string, string> = {
      bela: 'Bela',
      zuta: 'Žuta',
      crvena: 'Crvena',
      zelena: 'Zelena',
      plava: 'Plava',
      neoznacena: 'Neoznačena'
    };
    return map[c] || c;
  };

  // Render a custom SVG trend chart
  const renderTrendChart = (checks: QualityCheck[]) => {
    if (checks.length < 2) {
      return (
        <div className="chart-empty-state">
          <TrendingUp size={24} />
          <p>Potrebno je uneti najmanje dve ocene kako bi se prikazao grafikon trenda.</p>
        </div>
      );
    }

    // Sort chronologically (oldest to newest) for chart plotting
    const sorted = [...checks].sort((a, b) => new Date(a.check_date).getTime() - new Date(b.check_date).getTime());
    
    const width = 500;
    const height = 150;
    const padding = 20;

    const points = sorted.map((c, idx) => {
      const x = padding + (idx / (sorted.length - 1)) * (width - 2 * padding);
      // Score ranges 1 to 5. Map 5 to top (padding) and 1 to bottom (height - padding)
      const score = parseFloat(c.total_score);
      const y = height - padding - ((score - 1) / 4) * (height - 2 * padding);
      return { x, y, score, date: new Date(c.check_date).toLocaleDateString('sr-RS') };
    });

    const polylinePath = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
      <div className="svg-chart-container">
        <svg viewBox={`0 0 ${width} ${height}`} className="svg-chart">
          {/* Y Axis Grid Lines */}
          {[1, 2, 3, 4, 5].map((level) => {
            const y = height - padding - ((level - 1) / 4) * (height - 2 * padding);
            return (
              <g key={level}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} className="chart-grid-line" />
                <text x={padding - 5} y={y + 4} className="chart-axis-text" textAnchor="end">{level}</text>
              </g>
            );
          })}

          {/* Polyline path */}
          <polyline fill="none" stroke="var(--primary)" strokeWidth="3" points={polylinePath} />

          {/* Interactive Plot Dots */}
          {points.map((p, idx) => (
            <g key={idx} className="chart-dot-group">
              <circle cx={p.x} cy={p.y} r="5" className="chart-dot" />
              <circle cx={p.x} cy={p.y} r="8" className="chart-dot-hover" />
              <title>{`Datum: ${p.date}\nOcena: ${p.score}`}</title>
            </g>
          ))}
        </svg>
        <div className="chart-timeline-labels">
          <span>{points[0].date}</span>
          <span>{points[points.length - 1].date}</span>
        </div>
      </div>
    );
  };

  if (loading) return <div className="loading-state">Učitavanje detalja matice...</div>;
  if (error || !queen) return <div className="error-state">{error || 'Podaci nedostupni.'}</div>;

  return (
    <div className="queen-details-container">
      <div className="back-link">
        <Link to="/queens" className="btn btn-text">
          <ArrowLeft size={16} /> Nazad na listu matica
        </Link>
      </div>

      {/* Header card */}
      <div className="details-header-card glass-panel animated fadeIn">
        <div className="header-meta-icon">
          <span 
            className="color-dot-large" 
            style={{ 
              backgroundColor: queen.marking_color === 'bela' ? '#ffffff' :
                               queen.marking_color === 'zuta' ? '#fbbf24' :
                               queen.marking_color === 'crvena' ? '#ef4444' :
                               queen.marking_color === 'zelena' ? '#10b981' :
                               queen.marking_color === 'plava' ? '#3b82f6' : '#d1d5db',
              border: queen.marking_color === 'bela' ? '1px solid #9ca3af' : 'none'
            }}
          />
        </div>
        <div className="header-meta-text">
          <h2>Matica: {queen.queen_code}</h2>
          <p className="hive-type-tag">{queen.breed_name}</p>
        </div>
      </div>

      <div className="details-layout-grid">
        {/* Left column */}
        <div className="details-left-panel">
          
          {/* General specs */}
          <div className="details-card card glass-panel">
            <h3>Karakteristike</h3>
            <div className="details-fields">
              <div className="detail-field">
                <span className="field-label">Godina izleganja:</span>
                <span className="field-value">{queen.birth_year}</span>
              </div>
              <div className="detail-field">
                <span className="field-label">Starost:</span>
                <span className="field-value">{queen.age_years} god.</span>
              </div>
              <div className="detail-field">
                <span className="field-label">Boja oznake:</span>
                <span className="field-value">{getColorLabel(queen.marking_color)}</span>
              </div>
              <div className="detail-field">
                <span className="field-label">Poreklo:</span>
                <span className="field-value capitalize-value">{queen.origin}</span>
              </div>
              <div className="detail-field">
                <span className="field-label">Status:</span>
                <span className={`status-badge ${queen.status}`}>{queen.status}</span>
              </div>
              {queen.note && (
                <div className="detail-field note-field">
                  <span className="field-label">Napomena:</span>
                  <p className="field-value note-text">{queen.note}</p>
                </div>
              )}
            </div>
          </div>

          {/* Active location */}
          <div className="details-card card glass-panel">
            <h3>Trenutna lokacija</h3>
            {queen.current_hive ? (
              <div className="active-queen-box">
                <p className="active-queen-code">
                  Košnica: <Link to={`/hives/${queen.current_hive.id}`}><strong>{queen.current_hive.code}</strong></Link>
                </p>
                <p className="active-queen-date">
                  Pčelinjak: <strong>{queen.current_hive.apiary_name}</strong>
                </p>
                <p className="active-queen-date">
                  Lokacija: <strong><MapPin size={12} /> {queen.current_hive.location}</strong>
                </p>
              </div>
            ) : (
              <div className="no-active-queen-box">
                <p className="warning-text">Matica trenutno nije dodeljena nijednoj košnici.</p>
                <Link to="/assignments" className="btn btn-primary btn-sm btn-block">
                  <Plus size={14} /> Dodeli košnicu
                </Link>
              </div>
            )}
          </div>

          {/* Recommendation rating card */}
          <div className="details-card card glass-panel score-recommendation-card">
            <h3>Status kvaliteta</h3>
            <div className="quality-scores-summary">
              <div className="big-score-box">
                <span className="score-num">{queen.average_score || 'N/A'}</span>
                <span className="score-desc">Prosečna ocena</span>
              </div>
              <div className="recommendation-box">
                <span className="label">Preporuka sistema:</span>
                <span className={getRecommendationBadgeClass(queen.last_recommendation)}>
                  {getRecommendationLabel(queen.last_recommendation)}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right column */}
        <div className="details-right-panel">
          
          {/* Quality trend chart */}
          <div className="details-card card glass-panel">
            <h3><TrendingUp size={18} /> Trend kvaliteta matice</h3>
            {renderTrendChart(queen.quality_checks_history)}
          </div>

          {/* Check listings */}
          <div className="details-card card glass-panel">
            <div className="card-header-actions">
              <h3>Istorija pregleda</h3>
              {queen.current_hive && (
                <Link 
                  to={`/quality-checks/new?assignment_id=${queen.current_hive.assignment_id}`}
                  className="btn btn-primary btn-xs"
                >
                  <Plus size={14} /> Oceni maticu
                </Link>
              )}
            </div>

            {queen.quality_checks_history.length === 0 ? (
              <p className="empty-text">Još uvek nema unetih pregleda za ovu maticu.</p>
            ) : (
              <div className="checks-list-rows">
                {queen.quality_checks_history.map((check) => (
                  <div key={check.id} className="check-row-card glass-panel">
                    <div className="row-header">
                      <span className="row-date">
                        <Calendar size={12} /> {new Date(check.check_date).toLocaleDateString('sr-RS')}
                      </span>
                      <span className="row-hive-meta">Košnica: <strong>{check.hive_code}</strong></span>
                      <span className={getRecommendationBadgeClass(check.recommendation)}>
                        {getRecommendationLabel(check.recommendation)}
                      </span>
                    </div>
                    <div className="row-scores">
                      <span className="row-overall-score">
                        <Star size={14} className="icon-gold" /> <strong>{check.total_score}</strong>
                      </span>
                      <div className="subscores-row">
                        <span>Leglo: <strong>{check.brood_score}</strong></span>
                        <span>Zaleganje: <strong>{check.laying_score}</strong></span>
                        <span>Mirnoća: <strong>{check.temperament_score}</strong></span>
                        <span>Zdravlje: <strong>{check.health_score}</strong></span>
                      </div>
                    </div>
                    {check.note && <p className="row-note">"{check.note}"</p>}
                    <span className="row-checked-by">Pregledao: {check.checked_by_username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assignment history */}
          <div className="details-card card glass-panel">
            <h3><History size={18} /> Istorijat kretanja kroz košnice</h3>
            {queen.assignments_history.length === 0 ? (
              <p className="empty-text">Ova matica još uvek nije raspoređivana u košnice.</p>
            ) : (
              <div className="assignment-history-list">
                {queen.assignments_history.map((log) => (
                  <div key={log.assignment_id} className="history-row-card">
                    <div className="history-row-main">
                      <div className="queen-info-badges">
                        <Box size={16} />
                        <Link to={`/hives/${log.hive_id}`}><strong>{log.hive_code}</strong></Link>
                        <span className="text-dim">({log.apiary_name})</span>
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

export default QueenDetails;
