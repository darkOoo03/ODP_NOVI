import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Award, Star, ArrowLeft, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RankedQueen {
  id: number;
  queen_code: string;
  marking_color: string;
  birth_year: number;
  breed_name: string;
  avg_score: string;
  checks_count: number;
}

const Ranking: React.FC = () => {
  const navigate = useNavigate();
  const [ranking, setRanking] = useState<RankedQueen[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchRanking = async () => {
      try {
        setLoading(true);
        const response = await api.get('/dashboard/quality-ranking');
        setRanking(response.data);
      } catch (err) {
        console.error(err);
        setError('Neuspešno učitavanje rang liste.');
      } finally {
        setLoading(false);
      }
    };

    fetchRanking();
  }, []);

  const getRankBadgeClass = (index: number) => {
    if (index === 0) return 'rank-trophy gold';
    if (index === 1) return 'rank-trophy silver';
    if (index === 2) return 'rank-trophy bronze';
    return 'rank-number';
  };

  if (loading) return <div className="loading-state">Učitavanje rang liste...</div>;
  if (error) return <div className="error-state">{error}</div>;

  return (
    <div className="ranking-container">
      <div className="page-header-actions">
        <div>
          <h2>Rang lista matica</h2>
          <p>Rangiranje vaših matica na osnovu svih unetih kontrola kvaliteta.</p>
        </div>
      </div>

      <div className="ranking-layout-box">
        {ranking.length === 0 ? (
          <div className="empty-state-box card glass-panel">
            <p>Još uvek nema dovoljno podataka za formiranje rang liste. Unesite preglede kvaliteta za vaše matice.</p>
          </div>
        ) : (
          <div className="ranking-list-card card glass-panel">
            <div className="ranking-intro">
              <Trophy size={32} className="icon-gold" />
              <h3>Najbolje ocenjene matice</h3>
              <p>Matice su poređane od najbolje ocenjene ka lošijim. Skala se računa kao prosek svih kontrola kvaliteta.</p>
            </div>

            <div className="ranking-list-grid">
              {ranking.map((q, index) => (
                <div 
                  key={q.id} 
                  className={`ranking-item-card glass-panel clickable-card ${index < 3 ? 'top-three' : ''}`}
                  onClick={() => navigate(`/queens/${q.id}`)}
                >
                  <div className="item-position">
                    {index < 3 ? (
                      <span className={getRankBadgeClass(index)}>👑</span>
                    ) : (
                      <span className="item-number-badge">{index + 1}</span>
                    )}
                  </div>

                  <div className="item-main-details">
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
                      <h4>{q.queen_code}</h4>
                    </div>
                    <p className="item-subtext">{q.breed_name} | Godina: {q.birth_year}</p>
                  </div>

                  <div className="item-score-data">
                    <div className="rating-score">
                      <Star size={18} className="icon-gold" />
                      <span>{q.avg_score}</span>
                    </div>
                    <span className="checks-count-label">{q.checks_count} pregleda</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Ranking;
