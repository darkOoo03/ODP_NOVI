import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { Box, MapPin, Layers, Sparkles, Edit, Trash2, Plus, Search, X } from 'lucide-react';

interface Hive {
  id: number;
  code: string;
  hive_type_id: number;
  hive_type_name: string;
  apiary_name: string;
  location: string;
  note: string | null;
  active_queen_code: string | null;
  active_queen_id: number | null;
  last_check_score: string | null;
}

interface HiveType {
  id: number;
  name: string;
}

const HiveList: React.FC = () => {
  const navigate = useNavigate();
  const [hives, setHives] = useState<Hive[]>([]);
  const [hiveTypes, setHiveTypes] = useState<HiveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [apiaryFilter, setApiaryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<'add' | 'edit'>('add');
  const [editingHiveId, setEditingHiveId] = useState<number | null>(null);
  
  const [code, setCode] = useState('');
  const [hiveTypeId, setHiveTypeId] = useState('');
  const [apiaryName, setApiaryName] = useState('');
  const [location, setLocation] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchHives = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (apiaryFilter) params.apiary_name = apiaryFilter;
      if (locationFilter) params.location = locationFilter;
      if (typeFilter) params.hive_type_id = typeFilter;

      const response = await api.get('/hive', { params });
      setHives(response.data);
    } catch (err) {
      console.error(err);
      setError('Neuspešno preuzimanje košnica.');
    } finally {
      setLoading(false);
    }
  };

  const fetchHiveTypes = async () => {
    try {
      const response = await api.get('/dictionaries/hive-types');
      setHiveTypes(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchHiveTypes();
  }, []);

  useEffect(() => {
    fetchHives();
  }, [apiaryFilter, locationFilter, typeFilter]);

  const handleOpenAddModal = () => {
    setFormMode('add');
    setEditingHiveId(null);
    setCode('');
    setHiveTypeId(hiveTypes.length > 0 ? hiveTypes[0].id.toString() : '');
    setApiaryName('');
    setLocation('');
    setNote('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hive: Hive) => {
    setFormMode('edit');
    setEditingHiveId(hive.id);
    setCode(hive.code);
    setHiveTypeId(hive.hive_type_id.toString());
    setApiaryName(hive.apiary_name);
    setLocation(hive.location);
    setNote(hive.note || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!code.trim() || !hiveTypeId || !apiaryName.trim() || !location.trim()) {
      setFormError('Sva polja osim napomene su obavezna.');
      return;
    }

    if (!/^[A-Za-z]+-[0-9]+$/.test(code.trim())) {
      setFormError('Oznaka mora pratiti format SLOVO-BROJ (npr. A-01).');
      return;
    }

    if (apiaryName.trim().length < 2 || apiaryName.trim().length > 80) {
      setFormError('Naziv pčelinjaka mora imati 2-80 karaktera.');
      return;
    }

    if (note && note.length > 2000) {
      setFormError('Napomena može imati maksimalno 2000 karaktera.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        code: code.trim(),
        hive_type_id: parseInt(hiveTypeId, 10),
        apiary_name: apiaryName.trim(),
        location: location.trim(),
        note: note.trim() || null,
      };

      if (formMode === 'add') {
        await api.post('/hive', payload);
      } else {
        await api.put(`/hive/${editingHiveId}`, payload);
      }

      setIsModalOpen(false);
      fetchHives();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Greška pri čuvanju košnice.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveHive = async (id: number, code: string) => {
    if (window.confirm(`Da li ste sigurni da želite da arhivirate košnicu "${code}"?`)) {
      try {
        await api.delete(`/hive/${id}`);
        fetchHives();
      } catch (err) {
        console.error(err);
        alert('Greška pri arhiviranju košnice.');
      }
    }
  };

  return (
    <div className="hives-list-container">
      <div className="page-header-actions">
        <div>
          <h2>Moje košnice</h2>
          <p>Pregled i upravljanje vašim košnicama.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Nova košnica
        </button>
      </div>

      {/* Filters bar */}
      <div className="filters-card glass-panel">
        <div className="search-icon-wrapper">
          <Search size={18} />
          <span>Pretraga i filtriranje</span>
        </div>
        <div className="filters-grid">
          <div className="form-group">
            <input
              type="text"
              placeholder="Pčelinjak (npr. Bagremova paša)"
              className="form-control"
              value={apiaryFilter}
              onChange={(e) => setApiaryFilter(e.target.value)}
            />
          </div>
          <div className="form-group">
            <input
              type="text"
              placeholder="Lokacija (npr. Valjevo)"
              className="form-control"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
            />
          </div>
          <div className="form-group">
            <select
              className="form-control"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
            >
              <option value="">Svi tipovi košnica</option>
              {hiveTypes.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">Učitavanje košnica...</div>}
      {error && <div className="error-state">{error}</div>}

      {/* Grid of Hives */}
      {!loading && !error && (
        <>
          {hives.length === 0 ? (
            <div className="empty-state-box card glass-panel">
              <p>Nije pronađena nijedna košnica sa traženim kriterijumima.</p>
            </div>
          ) : (
            <div className="hives-grid">
              {hives.map((hive) => (
                <div key={hive.id} className="hive-card glass-panel clickable-card" onClick={() => navigate(`/hives/${hive.id}`)}>
                  <div className="hive-card-header">
                    <div className="hive-code-badge">
                      <Box size={18} />
                      <h3>{hive.code}</h3>
                    </div>
                    <div className="hive-card-actions" onClick={(e) => e.stopPropagation()}>
                      <button className="btn-icon" onClick={() => handleOpenEditModal(hive)}>
                        <Edit size={16} />
                      </button>
                      <button className="btn-icon danger" onClick={() => handleArchiveHive(hive.id, hive.code)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="hive-card-body">
                    <p className="hive-info-row">
                      <MapPin size={16} /> <strong>Lokacija:</strong> {hive.location}
                    </p>
                    <p className="hive-info-row">
                      <Layers size={16} /> <strong>Pčelinjak:</strong> {hive.apiary_name} ({hive.hive_type_name})
                    </p>
                    
                    <div className="hive-card-queen-info">
                      {hive.active_queen_code ? (
                        <>
                          <p>Aktivna matica: <strong>{hive.active_queen_code}</strong></p>
                          {hive.last_check_score ? (
                            <p className="queen-score-tag">
                              <Sparkles size={14} className="icon-gold" /> Ocena kvaliteta: <strong>{hive.last_check_score}</strong>
                            </p>
                          ) : (
                            <p className="no-score-tag">Nema pregleda</p>
                          )}
                        </>
                      ) : (
                        <p className="warning-text">Košnica nema aktivnu maticu!</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated scaleUp">
            <div className="modal-header">
              <h3>{formMode === 'add' ? 'Dodaj košnicu' : 'Izmeni košnicu'}</h3>
              <button className="btn-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="modal-form">
              {formError && (
                <div className="alert alert-danger">
                  <X size={18} />
                  {formError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="modal-code">Oznaka košnice (SLOVO-BROJ)</label>
                <input
                  id="modal-code"
                  type="text"
                  className="form-control"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="npr. A-01"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-type">Tip košnice</label>
                <select
                  id="modal-type"
                  className="form-control"
                  value={hiveTypeId}
                  onChange={(e) => setHiveTypeId(e.target.value)}
                  required
                >
                  <option value="" disabled>Izaberi tip košnice</option>
                  {hiveTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modal-apiary">Naziv pčelinjaka</label>
                <input
                  id="modal-apiary"
                  type="text"
                  className="form-control"
                  value={apiaryName}
                  onChange={(e) => setApiaryName(e.target.value)}
                  placeholder="npr. Bagremova pasa"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-location">Lokacija pčelinjaka</label>
                <input
                  id="modal-location"
                  type="text"
                  className="form-control"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="npr. Valjevska brda"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="modal-note">Napomena (Opciono)</label>
                <textarea
                  id="modal-note"
                  className="form-control"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Kratak opis ili specifičnosti košnice"
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

export default HiveList;
