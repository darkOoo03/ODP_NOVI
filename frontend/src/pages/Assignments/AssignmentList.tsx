import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { GitCompare, Calendar, Box, Activity, Plus, Search, X, Check, EyeOff } from 'lucide-react';

interface Assignment {
  id: number;
  queen_id: number;
  hive_id: number;
  assigned_at: string;
  ended_at: string | null;
  assignment_status: 'aktivna' | 'zavrsena';
  note: string | null;
  queen_code: string;
  marking_color: string;
  hive_code: string;
  apiary_name: string;
}

interface QueenDropdown {
  id: number;
  queen_code: string;
  marking_color: string;
}

interface HiveDropdown {
  id: number;
  code: string;
  apiary_name: string;
}

const AssignmentList: React.FC = () => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [activeQueens, setActiveQueens] = useState<QueenDropdown[]>([]);
  const [activeHives, setActiveHives] = useState<HiveDropdown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters state
  const [queenFilter, setQueenFilter] = useState('');
  const [hiveFilter, setHiveFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [queenId, setQueenId] = useState('');
  const [hiveId, setHiveId] = useState('');
  const [assignedAt, setAssignedAt] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Close assignment state
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [closingAssignmentId, setClosingAssignmentId] = useState<number | null>(null);
  const [endedAt, setEndedAt] = useState(new Date().toISOString().split('T')[0]);
  const [closingNote, setClosingNote] = useState('');
  const [closeFormError, setCloseFormError] = useState('');

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (queenFilter) params.queen_id = queenFilter;
      if (hiveFilter) params.hive_id = hiveFilter;
      if (statusFilter) params.assignment_status = statusFilter;

      const response = await api.get('/queen-hive-assignments', { params });
      setAssignments(response.data);
    } catch (err) {
      console.error(err);
      setError('Neuspešno preuzimanje dodela.');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdowns = async () => {
    try {
      // Get all active queens
      const queensRes = await api.get('/queens?status=aktivna');
      // Get all hives
      const hivesRes = await api.get('/hive');
      
      setActiveQueens(queensRes.data.map((q: any) => ({ id: q.id, queen_code: q.queen_code, marking_color: q.marking_color })));
      setActiveHives(hivesRes.data.map((h: any) => ({ id: h.id, code: h.code, apiary_name: h.apiary_name })));
    } catch (err) {
      console.error("Dropdown error:", err);
    }
  };

  useEffect(() => {
    fetchDropdowns();
    fetchAssignments();
  }, []);

  useEffect(() => {
    fetchAssignments();
  }, [queenFilter, hiveFilter, statusFilter]);

  const handleOpenAddModal = () => {
    setQueenId(activeQueens.length > 0 ? activeQueens[0].id.toString() : '');
    setHiveId(activeHives.length > 0 ? activeHives[0].id.toString() : '');
    setAssignedAt(new Date().toISOString().split('T')[0]);
    setNote('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenCloseModal = (id: number) => {
    setClosingAssignmentId(id);
    setEndedAt(new Date().toISOString().split('T')[0]);
    setClosingNote('');
    setCloseFormError('');
    setIsCloseModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!queenId || !hiveId || !assignedAt) {
      setFormError('Sva polja su obavezna.');
      return;
    }

    if (note && note.length > 2000) {
      setFormError('Napomena može imati maksimalno 2000 karaktera.');
      return;
    }

    setSubmitting(true);

    try {
      await api.post('/queen-hive-assignments', {
        queen_id: parseInt(queenId, 10),
        hive_id: parseInt(hiveId, 10),
        assigned_at: assignedAt,
        note: note.trim() || null
      });

      setIsModalOpen(false);
      fetchAssignments();
      fetchDropdowns(); // Refresh options
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Greška pri kreiranju dodele.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseAssignmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCloseFormError('');

    if (!endedAt) {
      setCloseFormError('Datum završetka je obavezan.');
      return;
    }

    if (closingNote && closingNote.length > 2000) {
      setCloseFormError('Napomena može imati maksimalno 2000 karaktera.');
      return;
    }

    try {
      await api.put(`/queen-hive-assignments/${closingAssignmentId}/end`, {
        ended_at: endedAt,
        note: closingNote.trim() || null
      });
      setIsCloseModalOpen(false);
      fetchAssignments();
      fetchDropdowns(); // Refresh options
    } catch (err: any) {
      setCloseFormError(err.response?.data?.message || 'Greška pri zatvaranju dodele.');
    }
  };

  return (
    <div className="assignments-container">
      <div className="page-header-actions">
        <div>
          <h2>Dodele matica košnicama</h2>
          <p>Raspored i kretanje aktivnih matica po košnicama.</p>
        </div>
        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          <Plus size={18} /> Nova dodela
        </button>
      </div>

      {/* Filters */}
      <div className="filters-card glass-panel">
        <div className="search-icon-wrapper">
          <Search size={18} />
          <span>Pretraga i filteri</span>
        </div>
        <div className="filters-grid">
          <div className="form-group">
            <select className="form-control" value={queenFilter} onChange={(e) => setQueenFilter(e.target.value)}>
              <option value="">Sve matice</option>
              {activeQueens.map((q) => (
                <option key={q.id} value={q.id}>{q.queen_code}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <select className="form-control" value={hiveFilter} onChange={(e) => setHiveFilter(e.target.value)}>
              <option value="">Sve košnice</option>
              {activeHives.map((h) => (
                <option key={h.id} value={h.id}>{h.code}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <select className="form-control" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">Svi statusi</option>
              <option value="aktivna">Aktivne dodele</option>
              <option value="zavrsena">Završene dodele</option>
            </select>
          </div>
        </div>
      </div>

      {loading && <div className="loading-state">Učitavanje dodela...</div>}
      {error && <div className="error-state">{error}</div>}

      {/* Assignments Table */}
      {!loading && !error && (
        <div className="table-wrapper-card card glass-panel">
          {assignments.length === 0 ? (
            <p className="empty-table-text">Nije pronađena nijedna dodela.</p>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Matica</th>
                  <th>Košnica</th>
                  <th>Pčelinjak</th>
                  <th>Datum dodele</th>
                  <th>Datum završetka</th>
                  <th>Status</th>
                  <th>Napomena</th>
                  <th>Akcija</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((log) => (
                  <tr key={log.id}>
                    <td>
                      <div className="queen-badge-code">
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
                        <strong>{log.queen_code}</strong>
                      </div>
                    </td>
                    <td><strong>{log.hive_code}</strong></td>
                    <td>{log.apiary_name}</td>
                    <td>{new Date(log.assigned_at).toLocaleDateString('sr-RS')}</td>
                    <td>
                      {log.ended_at ? new Date(log.ended_at).toLocaleDateString('sr-RS') : '-'}
                    </td>
                    <td>
                      <span className={`status-badge ${log.assignment_status}`}>
                        {log.assignment_status === 'aktivna' ? 'aktivna' : 'završena'}
                      </span>
                    </td>
                    <td className="note-cell-limit">{log.note || '-'}</td>
                    <td>
                      {log.assignment_status === 'aktivna' ? (
                        <button className="btn btn-outline btn-xs" onClick={() => handleOpenCloseModal(log.id)}>
                          <EyeOff size={12} /> Zatvori
                        </button>
                      ) : (
                        <span className="text-dim"><Check size={14} /> Zatvoreno</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add Assignment Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated scaleUp">
            <div className="modal-header">
              <h3>Nova dodela matice</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>
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

              <div className="alert alert-info">
                <GitCompare size={18} />
                Ukoliko matica ili košnica već imaju aktivnu dodelu, sistem će je automatski zatvoriti sa datumom nove dodele.
              </div>

              <div className="form-group">
                <label htmlFor="modal-queen">Izaberite maticu</label>
                <select
                  id="modal-queen"
                  className="form-control"
                  value={queenId}
                  onChange={(e) => setQueenId(e.target.value)}
                  required
                >
                  <option value="" disabled>Izaberi maticu</option>
                  {activeQueens.map((q) => (
                    <option key={q.id} value={q.id}>{q.queen_code}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modal-hive">Izaberite košnicu</label>
                <select
                  id="modal-hive"
                  className="form-control"
                  value={hiveId}
                  onChange={(e) => setHiveId(e.target.value)}
                  required
                >
                  <option value="" disabled>Izaberi košnicu</option>
                  {activeHives.map((h) => (
                    <option key={h.id} value={h.id}>{h.code} - {h.apiary_name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="modal-date">Datum dodele</label>
                <input
                  id="modal-date"
                  type="date"
                  className="form-control"
                  value={assignedAt}
                  onChange={(e) => setAssignedAt(e.target.value)}
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
                  placeholder="Unesite detalje o premeštanju ili razlog dodele"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsModalOpen(false)} disabled={submitting}>
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

      {/* Close Assignment Modal */}
      {isCloseModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel animated scaleUp">
            <div className="modal-header">
              <h3>Zatvaranje dodele</h3>
              <button className="btn-close" onClick={() => setIsCloseModalOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCloseAssignmentSubmit} className="modal-form">
              {closeFormError && (
                <div className="alert alert-danger">
                  <X size={18} />
                  {closeFormError}
                </div>
              )}

              <div className="form-group">
                <label htmlFor="close-date">Datum završetka</label>
                <input
                  id="close-date"
                  type="date"
                  className="form-control"
                  value={endedAt}
                  onChange={(e) => setEndedAt(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="close-note">Dodatna napomena (Opciono)</label>
                <textarea
                  id="close-note"
                  className="form-control"
                  value={closingNote}
                  onChange={(e) => setClosingNote(e.target.value)}
                  placeholder="Razlog zatvaranja (npr. matica se zamenjuje novom)"
                  rows={3}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setIsCloseModalOpen(false)}>
                  Otkaži
                </button>
                <button type="submit" className="btn btn-primary">
                  Zatvori dodelu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentList;
