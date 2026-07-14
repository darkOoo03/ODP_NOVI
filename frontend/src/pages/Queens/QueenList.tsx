import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Activity, Star, Award, Edit, Trash2, Plus, Search, X, ShieldAlert } from 'lucide-react';

interface Queen {
  id: number;
  queen_code: string;
  breed_id: number;
  breed_name: string;
  birth_year: number;
  marking_color: string;
  origin: string;
  status: string;
  note: string | null;
  current_hive_id: number | null;
  current_hive_code: string | null;
  average_score: string | null;
  last_recommendation: string | null;
}

interface Breed {
  id: number;
  name: string;
}

interface HiveDropdown {
  id: number;
  code: string;
}

const QueenList: React.FC = () => {
  const navigate = useNavigate();
  const [queens, setQueens] = useState<Queen[]>([]);
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [hives, setHives] = useState<HiveDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [statusFilter, setStatusFilter] = useState('');
  const [breedFilter, setBreedFilter] = useState('');
  const [colorFilter, setColorFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [hiveFilter, setHiveFilter] = useState('');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingQueenId, setEditingQueenId] = useState<number | null>(null);

  const [queenCode, setQueenCode] = useState('');
  const [breedId, setBreedId] = useState('');
  const [birthYear, setBirthYear] = useState(new Date().getFullYear().toString());
  const [markingColor, setMarkingColor] = useState('neoznacena');
  const [origin, setOrigin] = useState('nepoznato');
  const [status, setStatus] = useState('aktivna');
  const [note, setNote] = useState('');
  
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueens = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (breedFilter) params.breed_id = breedFilter;
      if (colorFilter) params.marking_color = colorFilter;
      if (yearFilter) params.birth_year = yearFilter;
      if (hiveFilter) params.current_hive_id = hiveFilter;

      const response = await api.get('/queens', { params });
      setQueens(response.data);
    } catch (err) {
      console.error(err);
      setError('Neuspešno preuzimanje matica.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      const [breedsRes, hivesRes] = await Promise.all([
        api.get('/dictionaries/queen-breeds'),
        api.get('/hive') // Hives list to filter/dropdown
      ]);
      setBreeds(breedsRes.data);
      setHives(hivesRes.data.map((h: any) => ({ id: h.id, code: h.code })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    fetchQueens();
  }, [statusFilter, breedFilter, colorFilter, yearFilter, hiveFilter]);

  // Reactive color calculation based on year
  const calculateColorForYear = (yearStr: string) => {
    const year = parseInt(yearStr, 10);
    if (isNaN(year) || year < 2000) return 'neoznacena';
    
    const lastDigit = year % 10;
    if (lastDigit === 1 || lastDigit === 6) return 'bela';
    if (lastDigit === 2 || lastDigit === 7) return 'zuta';
    if (lastDigit === 3 || lastDigit === 8) return 'crvena';
    if (lastDigit === 4 || lastDigit === 9) return 'zelena';
    if (lastDigit === 5 || lastDigit === 0) return 'plava';
    return 'neoznacena';
  };

  const handleYearChange = (val: string) => {
    setBirthYear(val);
    const suggestedColor = calculateColorForYear(val);
    setMarkingColor(suggestedColor);
  };

  const handleOpenAddModal = () => {
    setFormMode('add');
    setEditingQueenId(null);
    
    const currentYear = new Date().getFullYear().toString();
    setQueenCode('');
    setBreedId(breeds.length > 0 ? breeds[0].id.toString() : '');
    setBirthYear(currentYear);
    setMarkingColor(calculateColorForYear(currentYear));
    setOrigin('nepoznato');
    setStatus('aktivna');
    setNote('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (queen: Queen) => {
    setFormMode('edit');
    setEditingQueenId(queen.id);
    setQueenCode(queen.queen_code);
    setBreedId(queen.breed_id.toString());
    setBirthYear(queen.birth_year.toString());
    setMarkingColor(queen.marking_color);
    setOrigin(queen.origin);
    setStatus(queen.status);
    setNote(queen.note || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const yearVal = parseInt(birthYear, 10);
    const currentYear = new Date().getFullYear();

    if (!queenCode.trim() || !breedId || !birthYear || !markingColor || !origin || !status) {
      setFormError('Sva polja osim napomene su obavezna.');
      return;
    }

    if (!/^Q-[0-9]{4}-[0-9]+$/.test(queenCode.trim())) {
      setFormError('Oznaka mora pratiti format Q-GODINA-BROJ (npr. Q-2026-001).');
      return;
    }

    if (isNaN(yearVal) || yearVal < 2000 || yearVal > currentYear) {
      setFormError(`Godina izleganja mora biti između 2000 i ${currentYear}.`);
      return;
    }

    if (note && note.length > 2000) {
      setFormError('Napomena može imati maksimalno 2000 karaktera.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        queen_code: queenCode.trim(),
        breed_id: parseInt(breedId, 10),
        birth_year: yearVal,
        marking_color: markingColor,
        origin,
        status,
        note: note.trim() || null,
      };

      if (formMode === 'add') {
        await api.post('/queens', payload);
      } else {
        await api.put(`/queens/${editingQueenId}`, payload);
      }

      setIsModalOpen(false);
      fetchQueens();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Greška pri čuvanju matice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveQueen = async (id: number, code: string) => {
    if (window.confirm(`Da li ste sigurni da želite da arhivirate maticu "${code}"? (Sve njene aktivne dodele biće zatvorene)`)) {
      try {
        await api.delete(`/queens/${id}`);
        fetchQueens();
      } catch (err) {
        console.error(err);
        alert('Greška pri arhiviranju matice.');
      }
    }
  };

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

  const getRecommendationClass = (rec: string | null) => {
    if (!rec) return '';
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

  return (
    <div className="queens-list-container">
      <div className="page-header-actions">
        <div>
          <h2>Moje matice</h2>
          <p>Katalog i praćenje kvaliteta matica.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Nova matica
        </button>
      </div>

      {/* Filters card */}
      <div className="filters-card glass-panel">
        <div className="search-icon-wrapper">
          <Search size={18} />
          <span>Filteri i pretraga</span>
        </div>
        <div className="filters-grid">
          <div className="form-group">
            <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Svi statusi</option>
              <option value="aktivna">Aktivne</option>
              <option value="uginula">Uginule</option>
              <option value="prodata">Prodate</option>
            </select>
          </div>
          <div className="form-group">
            <select className="form-control" value={breedFilter} onChange={(e) => setBreedFilter(e.target.value)}>
              <option value="">Sve rase</option>
              {breeds.map((b) => (
                <option key={b.id} value={b.id}>{b.name.split(' (')[0]}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <select className="form-control" value={colorFilter} onChange={(e) => setColorFilter(e.target.value)}>
              <option value="">Sve boje</option>
              <option value="bela">Bela</option>
              <option value="zuta">Žuta</option>
              <option value="crvena">Crvena</option>
              <option value="zelena">Zelena</option>
              <option value="plava">Plava</option>
              <option value="neoznacena">Neoznačena</option>
            </select>
          </div>
          <div className="form-group">
            <input
              type="number"
              placeholder="Godina izleganja"
              className="form-control"
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            />
          </div>
          <div className="form-group">
            <select className="form-control" value={hiveFilter} onChange={(e) => setHiveFilter(e.target.value)}>
              <option value="">Sve košnice</option>
              {hives.map((h) => (
                <option key={h.id} value={h.id}>{h.code}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">Učitavanje matica...</div>}
      {error && <div className="error-state">{error}</div>}

      {/* Queens table */}
      {!loading && !error && (
        <div className="table-wrapper-card card glass-panel">
          {queens.length === 0 ? (
            <p className="empty-table-text">Nije pronađena nijedna matica.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Oznaka matice</th>
                  <th>Rasa</th>
                  <th>Godina</th>
                  <th>Boja oznake</th>
                  <th>Poreklo</th>
                  <th>Košnica</th>
                  <th>Ocena</th>
                  <th>Preporuka</th>
                  <th>Status</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {queens.map((q) => (
                  <tr key={q.id} className="clickable-row" onClick={() => navigate(`/queens/${q.id}`)}>
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
                    <td>{q.birth_year}</td>
                    <td>{getColorLabel(q.marking_color)}</td>
                    <td className="capitalize-cell">{q.origin}</td>
                    <td>
                      {q.current_hive_code ? (
                        <Link to={`/hives/${q.current_hive_id}`} className="link-standard" onClick={(e) => e.stopPropagation()}>
                          {q.current_hive_code}
                        </Link>
                      ) : (
                        <span className="text-dim">Nije dodeljena</span>
                      )}
                    </td>
                    <td>
                      {q.average_score ? (
                        <span className="score-label">
                          <Star size={12} className="icon-gold" /> {q.average_score}
                        </span>
                      ) : (
                        <span className="text-dim">-</span>
                      )}
                    </td>
                    <td>
                      <span className={getRecommendationClass(q.last_recommendation)}>
                        {getRecommendationLabel(q.last_recommendation)}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${q.status}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon" onClick={() => handleOpenEditModal(q)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleArchiveQueen(q.id, q.queen_code)}>
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated scaleUp">
            <div className="modal-header">
              <h3>{formMode === 'add' ? 'Dodaj maticu' : 'Izmeni maticu'}</h3>
              <button className="btn-close" onClick={handleCloseModal}>
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

              <div className="form-group">
                <label htmlFor="modal-queen-code">Oznaka matice (Format: Q-GODINA-BROJ)</label>
                <input
                  id="modal-queen-code"
                  type="text"
                  className="form-control"
                  value={queenCode}
                  onChange={(e) => setQueenCode(e.target.value)}
                  placeholder="npr. Q-2026-001"
                  required
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="modal-breed">Rasa matice</label>
                  <select
                    id="modal-breed"
                    className="form-control"
                    value={breedId}
                    onChange={(e) => setBreedId(e.target.value)}
                    required
                  >
                    <option value="" disabled>Izaberi rasu</option>
                    {breeds.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="modal-year">Godina izleganja</label>
                  <input
                    id="modal-year"
                    type="number"
                    min="2000"
                    max={new Date().getFullYear()}
                    className="form-control"
                    value={birthYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label htmlFor="modal-color">Boja oznake (Predloženo na osnovu godine)</label>
                  <select
                    id="modal-color"
                    className="form-control"
                    value={markingColor}
                    onChange={(e) => setMarkingColor(e.target.value)}
                    required
                  >
                    <option value="neoznacena">Neoznačena</option>
                    <option value="bela">Bela (White)</option>
                    <option value="zuta">Žuta (Yellow)</option>
                    <option value="crvena">Crvena (Red)</option>
                    <option value="zelena">Zelena (Green)</option>
                    <option value="plava">Plava (Blue)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="modal-origin">Poreklo matice</label>
                  <select
                    id="modal-origin"
                    className="form-control"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    required
                  >
                    <option value="kupljena">Kupljena</option>
                    <option value="rojena">Rojena</option>
                    <option value="selekcionisana">Selekcionisana</option>
                    <option value="nepoznato">Nepoznato poreklo</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-status">Status</label>
                <select
                  id="modal-status"
                  className="form-control"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  required
                >
                  <option value="aktivna">Aktivna</option>
                  <option value="uginula">Uginula</option>
                  <option value="prodata">Prodata</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modal-note">Napomena (Opciono)</label>
                <textarea
                  id="modal-note"
                  className="form-control"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Kratak opis ili specifičnosti matice"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={handleCloseModal} disabled={submitting}>
                  Otkaži
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Čuvanje...' : 'Sačuvaj'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QueenList;
