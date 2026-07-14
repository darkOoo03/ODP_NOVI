import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Box, 
  Activity, 
  AlertTriangle, 
  Award, 
  PlusCircle, 
  Star, 
  Clipboard, 
  ChevronRight,
  TrendingDown,
  Calendar
} from 'lucide-react';

interface SummaryData {
  total_hives: number;
  total_queens: number;
  hives_without_queen: number;
  overall_average: string | null;
  recent_checks: Array<{
    id: number;
    queen_code: string;
    hive_code: string;
    check_date: string;
    total_score: string;
    recommendation: string;
  }>;
}

interface WarningItem {
  type: 'OLD_QUEEN' | 'LOW_SCORE_QUEEN' | 'HIVE_WITHOUT_QUEEN' | 'UNCHECKED_QUEEN';
  target_id: number;
  title: string;
  description: string;
  severity: 'warning' | 'danger' | 'info';
}

interface RankedQueen {
  id: number;
  queen_code: string;
  marking_color: string;
  birth_year: number;
  breed_name: string;
  avg_score: string;
  checks_count: number;
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [warnings, setWarnings] = useState<WarningItem[]>([]);
  const [ranking, setRanking] = useState<RankedQueen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [summaryRes, warningsRes, rankingRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/warnings'),
          api.get('/dashboard/quality-ranking'),
        ]);

        setSummary(summaryRes.data);
        setWarnings(warningsRes.data);
        // Only show top 5 in dashboard ranking
        setRanking(rankingRes.data.slice(0, 5));
      } catch (err: any) {
        console.error("Dashboard load error:", err);
        setError('Neuspešno učitavanje podataka za dashboard.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  const getSeverityBadgeClass = (sev: string) => {
    if (sev === 'danger') return 'alert-icon danger';
    if (sev === 'warning') return 'alert-icon warning';
    return 'alert-icon info';
  };

  if (loading) return <div className="loading-state">Učitavanje dashboarda...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="dashboard-container">
      {/* Action buttons bar */}
      <div className="dashboard-actions-bar">
        <h2>Dashboard pčelinjaka</h2>
        <div className="quick-actions">
          <Link to="/hives" className="btn btn-outline btn-sm">
            <PlusCircle size={16} /> Nova košnica
          </Link>
          <Link to="/queens" className="btn btn-outline btn-sm">
            <PlusCircle size={16} /> Nova matica
          </Link>
          <Link to="/quality-checks" className="btn btn-primary btn-sm">
            <Clipboard size={16} /> Novi pregled
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <section className="stats-grid">
        <div className="stat-card glass-panel">
          <div className="stat-icon icon-green">
            <Box size={24} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{summary?.total_hives}</span>
            <span className="stat-label">Ukupno košnica</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-yellow">
            <Activity size={24} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{summary?.total_queens}</span>
            <span className="stat-label">Ukupno matica</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-red">
            <AlertTriangle size={24} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{summary?.hives_without_queen}</span>
            <span className="stat-label">Košnice bez matice</span>
          </div>
        </div>

        <div className="stat-card glass-panel">
          <div className="stat-icon icon-gold">
            <Star size={24} />
          </div>
          <div className="stat-data">
            <span className="stat-value">{summary?.overall_average || 'N/A'}</span>
            <span className="stat-label">Prosečna ocena</span>
          </div>
        </div>
      </section>

      {/* Main Grid: Left column (warnings), Right column (ranking/recent checks) */}
      <div className="dashboard-main-grid">
        
        {/* Warnings / Alerts Panel */}
        <section className="dashboard-section warnings-panel">
          <h3>
            <AlertTriangle size={20} className="icon-gold" /> Upozorenja i alarmi ({warnings.length})
          </h3>
          {warnings.length === 0 ? (
            <div className="empty-state-box card glass-panel">
              <p>Sjajno! Trenutno nema alarmantnih stanja na vašem pčelinjaku.</p>
            </div>
          ) : (
            <div className="warnings-list">
              {warnings.map((w, idx) => (
                <div key={idx} className={`warning-item-row ${w.severity}`}>
                  <div className={getSeverityBadgeClass(w.severity)}>
                    <AlertTriangle size={18} />
                  </div>
                  <div className="warning-content">
                    <h4>{w.title}</h4>
                    <p>{w.description}</p>
                  </div>
                  <div className="warning-link">
                    <button 
                      onClick={() => navigate(w.type === 'HIVE_WITHOUT_QUEEN' ? `/hives/${w.target_id}` : `/queens/${w.target_id}`)}
                      className="btn btn-icon-only"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Right side: Best queens ranking and recent checks */}
        <div className="dashboard-right-col">
          
          {/* Top Queens Ranking */}
          <section className="dashboard-section ranking-panel">
            <h3>
              <Award size={20} className="icon-gold" /> Rang lista najboljih matica
            </h3>
            {ranking.length === 0 ? (
              <div className="empty-state-box card glass-panel">
                <p>Nema unetih pregleda za rangiranje.</p>
              </div>
            ) : (
              <div className="ranking-table-card card glass-panel">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Pozicija</th>
                      <th>Oznaka</th>
                      <th>Rasa</th>
                      <th>Skor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((q, idx) => (
                      <tr key={q.id} className="clickable-row" onClick={() => navigate(`/queens/${q.id}`)}>
                        <td className="rank-cell">
                          <span className={`rank-badge rank-${idx + 1}`}>{idx + 1}</span>
                        </td>
                        <td>
                          <div className="queen-badge-code">
                            <span 
                              className="color-dot" 
                              style={{ 
                                backgroundColor: q.marking_color === 'bela' ? '#ffffff' :
                                                 q.marking_color === 'zuta' ? '#fbbf24' :
                                                 q.marking_color === 'crvena' ? '#ef4444' :
                                                 q.marking_color === 'zelena' ? '#10b981' :
                                                 q.marking_color === 'plava' ? '#3b82f6' : '#d1d5db',
                                border: q.marking_color === 'bela' ? '1px solid #9ca3af' : 'none'
                              }}
                            />
                            <strong>{q.queen_code}</strong>
                          </div>
                        </td>
                        <td>{q.breed_name.split(' (')[0]}</td>
                        <td className="score-cell">
                          <Star size={14} className="icon-gold" /> {q.avg_score}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Last 5 checks */}
          <section className="dashboard-section recent-checks-panel">
            <h3>
              <Clipboard size={20} className="icon-green" /> Poslednji pregledi
            </h3>
            {summary?.recent_checks.length === 0 ? (
              <div className="empty-state-box card glass-panel">
                <p>Nema nedavnih kontrola kvaliteta.</p>
              </div>
            ) : (
              <div className="recent-checks-list">
                {summary?.recent_checks.map((c) => (
                  <div 
                    key={c.id} 
                    className="check-row-card glass-panel clickable-card"
                    onClick={() => navigate(`/queens/${c.id}`)} // Redirect to queen details
                  >
                    <div className="check-row-meta">
                      <Calendar size={14} />
                      <span>{new Date(c.check_date).toLocaleDateString('sr-RS')}</span>
                    </div>
                    <div className="check-row-main">
                      <span>Matica: <strong>{c.queen_code}</strong></span>
                      <span>Košnica: <strong>{c.hive_code}</strong></span>
                      <span className="check-score">Ocena: {c.total_score}</span>
                    </div>
                    <div className="check-row-recommendation">
                      <span className={getRecommendationBadgeClass(c.recommendation)}>
                        {getRecommendationLabel(c.recommendation)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
};

export default Dashboard;
