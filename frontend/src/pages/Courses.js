import React, { useEffect, useState, useCallback } from 'react';
import { courseAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function CourseModal({ course, onClose, onSaved }) {
  const [form, setForm] = useState(course || { name: '', code: '', description: '', duration_years: 4, department: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.code) { setError('Name and code are required.'); return; }
    try {
      if (course?.id) await courseAPI.update(course.id, form);
      else await courseAPI.create(form);
      onSaved();
    } catch (e) { setError(e.response?.data?.error || 'Save failed'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <span className="modal-title">{course ? 'Edit Course' : 'Add Course'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid">
            <div className="form-group full">
              <label>Course Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Bachelor of Science in..." />
            </div>
            <div className="form-group">
              <label>Course Code *</label>
              <input value={form.code} onChange={e => set('code', e.target.value)} placeholder="BSCS" />
            </div>
            <div className="form-group">
              <label>Duration (Years)</label>
              <input type="number" min="1" max="8" value={form.duration_years} onChange={e => set('duration_years', e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Department</label>
              <input value={form.department || ''} onChange={e => set('department', e.target.value)} placeholder="College of Computing" />
            </div>
            <div className="form-group full">
              <label>Description</label>
              <textarea value={form.description || ''} onChange={e => set('description', e.target.value)} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Save Course</button>
        </div>
      </div>
    </div>
  );
}

export default function Courses() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const res = await courseAPI.getAll();
    setCourses(res.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return;
    setError('');
    try {
      await courseAPI.delete(id);
      load();
    } catch (e) { setError(e.response?.data?.error || 'Delete failed'); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{isAdmin ? 'All Courses' : 'My Courses'}</h1>
        <p className="page-subtitle">{courses.length} course{courses.length !== 1 ? 's' : ''} available</p>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

      <div className="toolbar">
        <div style={{ flex: 1 }} />
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Course</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : courses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <div className="empty-title">No courses yet</div>
            <div className="empty-text">Add your first course offering</div>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
          {courses.map(c => (
            <div className="card" key={c.id} style={{ padding: 0 }}>
              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{
                    background: 'var(--accent)', color: 'white',
                    borderRadius: 8, padding: '6px 10px',
                    fontWeight: 700, fontSize: 13, flexShrink: 0
                  }}>{c.code}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{c.name}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.department || 'No department'}</div>
                    {isAdmin && c.teacher_name && (
                      <div style={{ fontSize: 12, color: 'var(--accent)', marginTop: 4 }}>🧑‍🏫 {c.teacher_name}</div>
                    )}
                  </div>
                </div>
                {c.description && (
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 10, lineHeight: 1.5 }}>
                    {c.description}
                  </p>
                )}
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: 16 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{c.student_count}</strong> student{c.student_count !== 1 ? 's' : ''}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{c.duration_years}</strong> years
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn btn-sm btn-secondary" onClick={() => setModal(c)}>Edit</button>
                  {isAdmin && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(c.id, c.name)}>Delete</button>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <CourseModal
          course={modal === 'add' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
