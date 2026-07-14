import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Settings, 
  Users, 
  Layers, 
  Database, 
  ListTodo, 
  ShieldAlert, 
  Plus, 
  Edit, 
  Trash2, 
  Check, 
  X,
  Search,
  Activity
} from 'lucide-react';

interface UserRecord {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'pcelar' | 'admin';
  is_active: number;
  created_at: string;
  avatar: string | null;
  hives_count: number;
  queens_count: number;
  checks_count: number;
}

interface DictionaryItem {
  id: number;
  name: string;
  is_active: number;
}

interface SystemStats {
  users_count: number;
  hives_count: number;
  queens_count: number;
  checks_count: number;
}

interface AuditLog {
  id: number;
  user_id: number | null;
  username: string | null;
  action: string;
  details: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'catalogs' | 'stats' | 'logs'>('users');
  
  // Data lists
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [hiveTypes, setHiveTypes] = useState<DictionaryItem[]>([]);
  const [queenBreeds, setQueenBreeds] = useState<DictionaryItem[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Editing dictionaries state
  const [newItemName, setNewItemName] = useState('');
  const [editingItem, setEditingItem] = useState<{ id: number; type: 'hive' | 'breed'; name: string } | null>(null);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDictionaries = async () => {
    try {
      const [hivesRes, breedsRes] = await Promise.all([
        api.get('/admin/dictionaries/hive-types'),
        api.get('/admin/dictionaries/queen-breeds')
      ]);
      setHiveTypes(hivesRes.data);
      setQueenBreeds(breedsRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/admin/statistics');
      setStats(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLogs = async () => {
    try {
      const response = await api.get('/admin/audit-logs');
      setLogs(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTabData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'users') await fetchUsers();
      else if (activeTab === 'catalogs') await fetchDictionaries();
      else if (activeTab === 'stats') await fetchStats();
      else if (activeTab === 'logs') await fetchLogs();
    } catch (err) {
      setError('Greška pri učitavanju podataka.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTabData();
  }, [activeTab]);

  // User Actions
  const handleToggleUserStatus = async (userId: number, currentStatus: number) => {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    const msg = nextStatus === 1 ? 'aktivirate' : 'deaktivirate';
    if (window.confirm(`Da li ste sigurni da želite da ${msg} ovog korisnika?`)) {
      try {
        await api.put(`/admin/users/${userId}/status`, { is_active: nextStatus });
        fetchUsers();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Greška pri promeni statusa.');
      }
    }
  };

  const handleChangeUserRole = async (userId: number, currentRole: string) => {
    const nextRole = currentRole === 'admin' ? 'pcelar' : 'admin';
    if (window.confirm(`Da li ste sigurni da želite da promenite ulogu korisnika u ${nextRole}?`)) {
      try {
        await api.put(`/admin/users/${userId}/role`, { role: nextRole });
        fetchUsers();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Greška pri promeni uloge.');
      }
    }
  };

  // Dictionary Actions
  const handleAddDictionaryItem = async (type: 'hive' | 'breed') => {
    if (!newItemName.trim() || newItemName.trim().length < 2) {
      alert('Naziv mora imati najmanje 2 karaktera.');
      return;
    }

    try {
      const endpoint = type === 'hive' ? '/admin/dictionaries/hive-types' : '/admin/dictionaries/queen-breeds';
      await api.post(endpoint, { name: newItemName.trim() });
      setNewItemName('');
      fetchDictionaries();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Greška pri dodavanju.');
    }
  };

  const handleUpdateDictionaryItem = async () => {
    if (!editingItem) return;
    if (!editingItem.name.trim() || editingItem.name.trim().length < 2) {
      alert('Naziv mora imati najmanje 2 karaktera.');
      return;
    }

    try {
      const endpoint = editingItem.type === 'hive' 
        ? `/admin/dictionaries/hive-types/${editingItem.id}` 
        : `/admin/dictionaries/queen-breeds/${editingItem.id}`;
      
      await api.put(endpoint, { name: editingItem.name.trim() });
      setEditingItem(null);
      fetchDictionaries();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Greška pri izmeni.');
    }
  };

  const handleToggleDictionaryStatus = async (id: number, type: 'hive' | 'breed', currentStatus: number) => {
    const nextStatus = currentStatus === 1 ? 0 : 1;
    try {
      const endpoint = type === 'hive' 
        ? `/admin/dictionaries/hive-types/${id}` 
        : `/admin/dictionaries/queen-breeds/${id}`;
      
      await api.put(endpoint, { is_active: nextStatus });
      fetchDictionaries();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Greška pri izmeni statusa.');
    }
  };

  return (
    <div className="admin-container">
      <div className="page-header-actions">
        <div>
          <h2>Administratorski Panel</h2>
          <p>Globalna statistika, upravljanje ulogama, katalozima i praćenje aktivnosti.</p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="admin-tabs-list">
        <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
          <Users size={16} /> Korisnici
        </button>
        <button className={`tab-btn ${activeTab === 'catalogs' ? 'active' : ''}`} onClick={() => setActiveTab('catalogs')}>
          <Layers size={16} /> Šifrarnici (Katalozi)
        </button>
        <button className={`tab-btn ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>
          <Database size={16} /> Statistika sistema
        </button>
        <button className={`tab-btn ${activeTab === 'logs' ? 'active' : ''}`} onClick={() => setActiveTab('logs')}>
          <Activity size={16} /> Logovi aktivnosti
        </button>
      </div>

      {loading && <div className="loading-state">Učitavanje podataka...</div>}
      {error && <div className="error-state">{error}</div>}

      {/* Tab Contents */}
      {!loading && !error && (
        <div className="admin-tab-content animated fadeIn">
          
          {/* TAB 1: USERS */}
          {activeTab === 'users' && (
            <div className="table-wrapper-card card glass-panel">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Korisnik</th>
                    <th>Email</th>
                    <th>Uloga</th>
                    <th>Košnice</th>
                    <th>Matice</th>
                    <th>Pregledi</th>
                    <th>Nalog kreiran</th>
                    <th>Status</th>
                    <th>Akcije</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <strong>{u.first_name} {u.last_name}</strong>
                        <div className="text-dim">@{u.username}</div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge ${u.role}`}>
                          {u.role === 'admin' ? 'admin' : 'pčelar'}
                        </span>
                      </td>
                      <td>{u.hives_count}</td>
                      <td>{u.queens_count}</td>
                      <td>{u.checks_count}</td>
                      <td>{new Date(u.created_at).toLocaleDateString('sr-RS')}</td>
                      <td>
                        <span className={`status-badge ${u.is_active ? 'aktivna' : 'uginula'}`}>
                          {u.is_active ? 'Aktivan' : 'Deaktiviran'}
                        </span>
                      </td>
                      <td>
                        <div className="admin-user-row-actions">
                          <button 
                            className="btn btn-outline btn-xs" 
                            onClick={() => handleChangeUserRole(u.id, u.role)}
                          >
                            Promeni ulogu
                          </button>
                          <button 
                            className={`btn btn-xs ${u.is_active ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                          >
                            {u.is_active ? 'Deaktiviraj' : 'Aktiviraj'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 2: CATALOGS */}
          {activeTab === 'catalogs' && (
            <div className="catalogs-grid">
              
              {/* Hive Types Catalog */}
              <div className="catalog-column-card card glass-panel">
                <h3>Tipovi košnica</h3>
                
                {/* Form to add */}
                <div className="catalog-inline-form form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Novi tip košnice (npr. Farar)"
                    value={editingItem?.type === 'hive' ? '' : newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={() => handleAddDictionaryItem('hive')}>
                    <Plus size={16} /> Dodaj
                  </button>
                </div>

                <div className="catalog-items-list">
                  {hiveTypes.map((item) => (
                    <div key={item.id} className="catalog-item-row">
                      {editingItem?.id === item.id && editingItem.type === 'hive' ? (
                        <div className="catalog-edit-inputs">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          />
                          <button className="btn btn-success btn-xs" onClick={handleUpdateDictionaryItem}><Check size={12} /></button>
                          <button className="btn btn-outline btn-xs" onClick={() => setEditingItem(null)}><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <div className="item-name-status">
                            <span className={item.is_active ? '' : 'text-dim text-strike'}>{item.name}</span>
                            <span className={`status-dot ${item.is_active ? 'active' : 'inactive'}`} />
                          </div>
                          <div className="item-actions">
                            <button className="btn-icon" onClick={() => setEditingItem({ id: item.id, type: 'hive', name: item.name })}>
                              <Edit size={14} />
                            </button>
                            <button 
                              className={`btn-icon ${item.is_active ? 'danger' : 'success'}`} 
                              onClick={() => handleToggleDictionaryStatus(item.id, 'hive', item.is_active)}
                            >
                              {item.is_active ? <EyeOff size={14} /> : <Check size={14} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Queen Breeds Catalog */}
              <div className="catalog-column-card card glass-panel">
                <h3>Rase matica</h3>
                
                {/* Form to add */}
                <div className="catalog-inline-form form-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nova rasa matice"
                    value={editingItem?.type === 'breed' ? '' : newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                  />
                  <button className="btn btn-primary" onClick={() => handleAddDictionaryItem('breed')}>
                    <Plus size={16} /> Dodaj
                  </button>
                </div>

                <div className="catalog-items-list">
                  {queenBreeds.map((item) => (
                    <div key={item.id} className="catalog-item-row">
                      {editingItem?.id === item.id && editingItem.type === 'breed' ? (
                        <div className="catalog-edit-inputs">
                          <input
                            type="text"
                            className="form-control form-control-sm"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                          />
                          <button className="btn btn-success btn-xs" onClick={handleUpdateDictionaryItem}><Check size={12} /></button>
                          <button className="btn btn-outline btn-xs" onClick={() => setEditingItem(null)}><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <div className="item-name-status">
                            <span className={item.is_active ? '' : 'text-dim text-strike'}>{item.name}</span>
                            <span className={`status-dot ${item.is_active ? 'active' : 'inactive'}`} />
                          </div>
                          <div className="item-actions">
                            <button className="btn-icon" onClick={() => setEditingItem({ id: item.id, type: 'breed', name: item.name })}>
                              <Edit size={14} />
                            </button>
                            <button 
                              className={`btn-icon ${item.is_active ? 'danger' : 'success'}`} 
                              onClick={() => handleToggleDictionaryStatus(item.id, 'breed', item.is_active)}
                            >
                              {item.is_active ? <EyeOff size={14} /> : <Check size={14} />}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: STATISTICS */}
          {activeTab === 'stats' && (
            <div className="stats-dashboard-grid">
              <div className="stat-card glass-panel">
                <Users size={32} className="icon-green" />
                <div className="stat-data">
                  <span className="stat-value">{stats?.users_count}</span>
                  <span className="stat-label">Registrovano korisnika</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <Layers size={32} className="icon-yellow" />
                <div className="stat-data">
                  <span className="stat-value">{stats?.hives_count}</span>
                  <span className="stat-label">Ukupno košnica u sistemu</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <Activity size={32} className="icon-gold" />
                <div className="stat-data">
                  <span className="stat-value">{stats?.queens_count}</span>
                  <span className="stat-label">Ukupno matica u sistemu</span>
                </div>
              </div>
              <div className="stat-card glass-panel">
                <ListTodo size={32} className="icon-red" />
                <div className="stat-data">
                  <span className="stat-value">{stats?.checks_count}</span>
                  <span className="stat-label">Unetih pregleda kvaliteta</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: AUDIT LOGS */}
          {activeTab === 'logs' && (
            <div className="table-wrapper-card card glass-panel">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Vreme dogadjaja</th>
                    <th>Korisnik</th>
                    <th>Akcija</th>
                    <th>Detalji aktivnosti</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id}>
                      <td className="date-cell">
                        {new Date(log.created_at).toLocaleString('sr-RS')}
                      </td>
                      <td>
                        {log.username ? (
                          <strong>@{log.username}</strong>
                        ) : (
                          <span className="text-dim">Gost / Nepoznat</span>
                        )}
                        {log.user_id && <div className="text-xs text-dim">ID: {log.user_id}</div>}
                      </td>
                      <td>
                        <span className="badge badge-info">{log.action}</span>
                      </td>
                      <td>{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}
    </div>
  );
};

// SVG Placeholder icons to solve warnings
const EyeOff: React.FC<{ size: number }> = ({ size }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export default AdminDashboard;
