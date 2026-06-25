import React, { useEffect, useState, useCallback } from 'react';
import { userAPI } from '../../services/api';

function UserModal({ user, onClose, onSaved }) {
  const isNew = !user;
  const [form, setForm] = useState(user
    ? { full_name: user.full_name, email: user.email, role: user.role, is_active: user.is_active, password: '' }
    : { full_name: '', username: '', email: '', password: '', role: 'teacher' }
  );
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (isNew && (!form.full_name || !form.username || !form.email || !form.password)) {
      setError('All fields are required.'); return;
    }
    if (!isNew && (!form.full_name || !form.email)) {
      setError('Name and email are required.'); return;
    }
    setSaving(true);
    try {
      if (isNew) await userAPI.register(form);
      else await userAPI.update(user.id, form);
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">{isNew ? 'Add Account' : 'Edit Account'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid">
            <div className="form-group full">
              <label>Full Name *</label>
              <input value={form.full_name} onChange={e => set('full_name', e.target.value)} />
            </div>
            {isNew && (
              <div className="form-group full">
                <label>Username *</label>
                <input value={form.username} onChange={e => set('username', e.target.value)} />
              </div>
            )}
            <div className="form-group full">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {!isNew && (
              <div className="form-group">
                <label>Status</label>
                <select value={form.is_active ? '1' : '0'} onChange={e => set('is_active', e.target.value === '1')}>
                  <option value="1">Active</option>
                  <option value="0">Disabled</option>
                </select>
              </div>
            )}
            <div className="form-group full">
              <label>{isNew ? 'Password *' : 'Reset Password (optional)'}</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder={isNew ? '••••••••' : 'Leave blank to keep current'} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Teachers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await userAPI.getAll();
    setUsers(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete account "${name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await userAPI.delete(id);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Delete failed'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Teachers & Admins</h1>
        <p className="page-subtitle">{users.length} account{users.length !== 1 ? 's' : ''} registered</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="toolbar">
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Account</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Students</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="avatar-sm" style={{ background: u.role === 'admin' ? 'var(--accent)' : 'var(--navy-mid)' }}>
                      {u.avatar_initials}
                    </div>
                    <span style={{ fontWeight: 500 }}>{u.full_name}</span>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{u.username}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                  <td><span className={`badge ${u.role === 'admin' ? 'badge-blue' : 'badge-green'}`}>{u.role}</span></td>
                  <td>{u.role === 'teacher' ? u.student_count : '—'}</td>
                  <td><span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>{u.is_active ? 'Active' : 'Disabled'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setModal(u)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id, u.full_name)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <UserModal
          user={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
