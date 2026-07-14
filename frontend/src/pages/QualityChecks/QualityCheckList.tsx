import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Clipboard, Calendar, Box, Activity, Star, Plus, Search, X, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';

interface QualityCheck {
  id: number;
  assignment_id: number;
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
  queen_code: string;
  hive_code: string;
}

interface ActiveAssignment {
  id: number;
  queen_code: string;
  hive_code: string;
  apiary_name: string;
}

const QualityCheckList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checks, setChecks] = useState<QualityCheck[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<ActiveAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [assignmentFilter, setAssignmentFilter] = useState('');
  const [recFilter, setRecFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [assignmentId, setAssignmentId] = useState('');
  const [checkDate, setCheckDate] = useState(new Date().toISOString().split('T')[0]);
  const [isQueenSeen, setIsQueenSeen] = useState(true);
  const [areEggsSeen, setAreEggsSeen] = useState(true);
  
  // 5 score dimensions (default to 4)
  const [broodScore, setBroodScore] = useState(4);
  const [layingScore, setLayingScore] = useState(4);
  const [temperamentScore, setTemperamentScore] = useState(4);
  const [productivityScore, setProductivityScore] = useState(4);
  const [healthScore, setHealthScore] = useState(4);
  
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Live calculator preview state
  const [previewScore, setPreviewScore] = useState(4.0);
  const [previewRec, setPreviewRec] = useState('zadrzati');

  const fetchChecks = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (assignmentFilter) params.assignment_id = assignmentFilter;
      if (recFilter) params.recommendation = recFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const response = await api.get('/queen-quality-checks', { params });
      setChecks(response.data);
    } catch (err) {
      console.error(err);
      setError('Neuspešno preuzimanje pregleda kvaliteta.');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveAssignments = async () => {
    try {
      const response = await api.get('/queen-hive-assignments?assignment_status=aktivna');
      setActiveAssignments(response.data.map((item: any) => ({
        id: item.id,
        queen_code: item.queen_code,
        hive_code: item.hive_code,
        apiary_name: item.apiary_name
      })));
    } catch (err) {
      console.error(err);
    }
  };

  // Run on mount
  useEffect(() => {
    fetchActiveAssignments();
    fetchChecks();

    // Check if assignment_id was passed in URL queries (e.g. from Hive Details)
    const queryParams = new URLSearchParams(location.search);
    const preselect = queryParams.get('assignment_id');
    if (preselect) {
      setAssignmentId(preselect);
      setIsModalOpen(true);
    }
  }, [location]);

  // Run checks filter updates
  useEffect(() => {
    fetchChecks();
  }, [assignmentFilter, recFilter, dateFrom, dateTo]);

  // Live preview calculator
  useEffect(() => {
    if (!isQueenSeen) {
      setPreviewScore(0.0);
      setPreviewRec('dodati_novu');
      return;
    }
    const avg = (broodScore + layingScore + temperamentScore + productivityScore + healthScore) / 5.0;
    setPreviewScore(parseFloat(avg.toFixed(2)));

    let rec = 'zadrzati';
    if (avg >= 4.0) rec = 'zadrzati';
    else if (avg >= 3.0) rec = 'pratiti';
    else if (avg >= 2.0) rec = 'zameniti';
    else rec = 'hitno_zameniti';

    setPreviewRec(rec);
  }, [isQueenSeen, broodScore, layingScore, temperamentScore, productivityScore, healthScore]);

  const handleOpenAddModal = () => {
    const preselectedId = new URLSearchParams(location.search).get('assignment_id');
    setAssignmentId(preselectedId || (activeAssignments.length > 0 ? activeAssignments[0].id.toString() : ''));
    setCheckDate(new Date().toISOString().split('T')[0]);
    setIsQueenSeen(true);
    setAreEggsSeen(true);
    setBroodScore(4);
    setLayingScore(4);
    setTemperamentScore(4);
    setProductivityScore(4);
    setHealthScore(4);
    setNote('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!assignmentId || !checkDate) {
      setFormError('Izaberite dodelu i datum pregleda.');
      return;
    }

    if (new Date(checkDate) > new Date()) {
      setFormError('Datum kontrole ne sme biti u budućnosti.');
      return;
    }

    if (note && note.length > 2000) {
      setFormError('Napomena može imati maksimalno 2000 karaktera.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/queen-quality-checks', {
        assignment_id: parseInt(assignmentId, 10),
        check_date: checkDate,
        is_queen_seen: isQueenSeen,
        are_eggs_seen: areEggsSeen,
        brood_score: broodScore,
        laying_score: layingScore,
        temperament_score: temperamentScore,
        productivity_score: productivityScore,
        health_score: healthScore,
        note: note.trim() || null
      });

      setIsModalOpen(false);
      fetchChecks();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Greška pri kreiranju pregleda.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCheck = async (id: number) => {
    if (window.confirm('Da li ste sigurni da želite da obrišete ovaj pregled? (Istorija ocene kvaliteta biće promenjena)')) {
      try {
        await api.delete(`/queen-quality-checks/${id}`);
        fetchChecks();
      } catch (err) {
        console.error(err);
        alert('Greška pri brisanju pregleda.');
      }
    }
  };

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

  // Render a clickable 1-5 selector group
  const renderScorePicker = (label: string, value: number, onChange: (val: number) => void) => {
    return (
      <div className="score-picker-group">
        <span className="score-picker-label">{label}:</span>
        <div className="score-buttons">
          {[1, 2, 3, 4, 5].map((score) => (
            <button
              key={score}
              type="button"
              className={`score-btn ${value === score ? 'active' : ''}`}
              onClick={() => onChange(score)}
            >
              {score}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="quality-checks-container">
      <div className="page-header-actions">
        <div>
          <h2>Kontrole kvaliteta matica</h2>
          <p>Pregledi stanja legla, zdravlja, ponašanja i produktivnosti matica.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Novi pregled
        </button>
      </div>

      {/* Filters */}
      <div className="filters-card glass-panel">
        <div className="search-icon-wrapper">
          <Search size={18} />
          <span>Filtriranje pregleda</span>
        </div>
        <div className="filters-grid-4">
          <div className="form-group">
            <select className="form-control" value={assignmentFilter} onChange={(e) => setAssignmentFilter(e.target.value)}>
              <option value="">Sve matice i košnice</option>
              {activeAssignments.map((a) => (
                <option key={a.id} value={a.id}>{a.queen_code} (Košnica: {a.hive_code})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <select className="form-control" value={recFilter} onChange={(e) => setRecFilter(e.target.value)}>
              <option value="">Sve preporuke</option>
              <option value="zadrzati">Zadržati</option>
              <option value="pratiti">Pratiti</option>
              <option value="zameniti">Zameniti</option>
              <option value="hitno_zameniti">Hitno zameniti</option>
              <option value="dodati_novu">Dodati novu maticu</option>
            </select>
          </div>
          <div className="form-group">
            <input
              type="date"
              className="form-control"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="Od datuma"
            />
          </div>
          <div className="form-group">
            <input
              type="date"
              className="form-control"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="Do datuma"
            />
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">Učitavanje pregleda...</div>}
      {error && <div className="error-state">{error}</div>}

      {/* List of Quality Checks */}
      {!loading && !error && (
        <div className="checks-feed-grid">
          {checks.length === 0 ? (
            <div className="empty-state-box card glass-panel">
              <p>Nema pronađenih pregleda kvaliteta sa zadatim filterima.</p>
            </div>
          ) : (
            <div className="checks-feed-list">
              {checks.map((check) => (
                <div key={check.id} className="check-row-card glass-panel animated fadeIn">
                  <div className="row-header">
                    <span className="row-date">
                      <Calendar size={14} /> {new Date(check.check_date).toLocaleDateString('sr-RS')}
                    </span>
                    <span className="row-queen-meta">
                      Matica: <Link to={`/queens/${check.id}`}><strong>{check.queen_code}</strong></Link>
                    </span>
                    <span className="row-hive-meta">
                      Košnica: <Link to={`/hives/${check.id}`}><strong>{check.hive_code}</strong></Link>
                    </span>
                    <span className={getRecommendationBadgeClass(check.recommendation)}>
                      {getRecommendationLabel(check.recommendation)}
                    </span>
                    <button className="btn-delete-check text-danger" onClick={() => handleDeleteCheck(check.id)}>
                      Obrisi
                    </button>
                  </div>

                  <div className="row-body">
                    <div className="score-summary-row">
                      <span className="score-main">
                        <Star size={18} className="icon-gold" /> <strong>{check.total_score}</strong>
                      </span>
                      <div className="seen-indicators">
                        <span className={`indicator ${check.is_queen_seen ? 'seen' : 'unseen'}`}>
                          Matica viđena: {check.is_queen_seen ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        </span>
                        <span className={`indicator ${check.are_eggs_seen ? 'seen' : 'unseen'}`}>
                          Jaja viđena: {check.are_eggs_seen ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        </span>
                      </div>
                    </div>

                    {check.is_queen_seen === 1 && (
                      <div className="subscores-grid">
                        <span>Leglo: <strong>{check.brood_score}</strong></span>
                        <span>Zaleganje: <strong>{check.laying_score}</strong></span>
                        <span>Mirnoća: <strong>{check.temperament_score}</strong></span>
                        <span>Prinos: <strong>{check.productivity_score}</strong></span>
                        <span>Zdravlje: <strong>{check.health_score}</strong></span>
                      </div>
                    )}

                    {check.note && (
                      <p className="check-note-text">
                        <strong>Napomena:</strong> "{check.note}"
                      </p>
                    )}
                    <span className="checked-by-label">Pregledao: <strong>{check.checked_by_username}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Review Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel modal-lg animated scaleUp">
            <div className="modal-header">
              <h3>Novi pregled kvaliteta</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="modal-form">
              {formError && (
                <div className="alert alert-danger">
                  <ShieldAlert size={18} />
                  {formError}
                </div>
              )}

              <div className="form-grid-2">
                
                {/* Left Side: General and switches */}
                <div className="form-col">
                  <div className="form-group">
                    <label htmlFor="modal-assignment">Dodeljena matica / košnica</label>
                    <select
                      id="modal-assignment"
                      className="form-control"
                      value={assignmentId}
                      onChange={(e) => setAssignmentId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Izaberi dodelu</option>
                      {activeAssignments.map((a) => (
                        <option key={a.id} value={a.id}>
                          Matica {a.queen_code} u košnici {a.hive_code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="modal-check-date">Datum pregleda</label>
                    <input
                      id="modal-check-date"
                      type="date"
                      className="form-control"
                      value={checkDate}
                      onChange={(e) => setCheckDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="switches-box form-group">
                    <label className="switch-container">
                      <input
                        type="checkbox"
                        checked={isQueenSeen}
                        onChange={(e) => setIsQueenSeen(e.target.checked)}
                      />
                      <span className="switch-slider" />
                      <span className="switch-label">Matica viđena u košnici</span>
                    </label>

                    <label className="switch-container">
                      <input
                        type="checkbox"
                        checked={areEggsSeen}
                        onChange={(e) => setAreEggsSeen(e.target.checked)}
                      />
                      <span className="switch-slider" />
                      <span className="switch-label">Sveža jaja viđena</span>
                    </label>
                  </div>

                  <div className="form-group">
                    <label htmlFor="modal-check-note">Napomena (Opciono)</label>
                    <textarea
                      id="modal-check-note"
                      className="form-control"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Unesite zapažanja, ponašanje ili stanje pčelinjeg društva..."
                      rows={4}
                    />
                  </div>
                </div>

                {/* Right Side: Scores and Preview */}
                <div className="form-col">
                  {isQueenSeen ? (
                    <div className="scores-pickers-box card glass-panel">
                      <h4>Ocenite maticu (1 - 5)</h4>
                      {renderScorePicker('Kvalitet legla', broodScore, setBroodScore)}
                      {renderScorePicker('Intenzitet zaleganja', layingScore, setLayingScore)}
                      {renderScorePicker('Mirnoća na saću', temperamentScore, setTemperamentScore)}
                      {renderScorePicker('Prinos / Produktivnost', productivityScore, setProductivityScore)}
                      {renderScorePicker('Zdravstveno stanje', healthScore, setHealthScore)}
                    </div>
                  ) : (
                    <div className="alert alert-warning">
                      <ShieldAlert size={18} />
                      Ukoliko matica nije viđena, sistem će automatski predložiti preporuku <strong>"Dodati novu"</strong>.
                    </div>
                  )}

                  {/* Calculator live preview */}
                  <div className="live-preview-box card glass-panel">
                    <h4>Proračun kvaliteta (Live Preview)</h4>
                    <div className="preview-row">
                      <div className="preview-score-circle">
                        <span>{previewScore}</span>
                      </div>
                      <div className="preview-details">
                        <span className="label">Preporuka:</span>
                        <span className={getRecommendationBadgeClass(previewRec)}>
                          {getRecommendationLabel(previewRec)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
                  Otkaži
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Čuvanje...' : 'Sačuvaj pregled'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QualityCheckList;
