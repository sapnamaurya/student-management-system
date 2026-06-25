import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { studentAPI, courseAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function StudentModal({ student, courses, onClose, onSaved }) {
  const [form, setForm] = useState(student || {
    student_id: '', first_name: '', last_name: '', email: '', phone: '',
    date_of_birth: '', gender: '', address: '', course_id: '', year_level: 1, status: 'active'
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.student_id || !form.first_name || !form.last_name || !form.email) {
      setError('Student ID, name, and email are required.'); return;
    }
    setSaving(true); setError('');
    try {
      if (student?.id) await studentAPI.update(student.id, form);
      else await studentAPI.create(form);
      onSaved();
    } catch (e) {
      setError(e.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{student?.id ? 'Edit Student' : 'Add New Student'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid">
            <div className="form-group">
              <label>Student ID *</label>
              <input value={form.student_id} onChange={e => set('student_id', e.target.value)} placeholder="2026-0001" disabled={!!student?.id} />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={e => set('status', e.target.value)}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
                <option value="dropped">Dropped</option>
              </select>
            </div>
            <div className="form-group">
              <label>First Name *</label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Last Name *</label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input value={form.phone || ''} onChange={e => set('phone', e.target.value)} placeholder="09XXXXXXXXX" />
            </div>
            <div className="form-group">
              <label>Date of Birth</label>
              <input type="date" value={form.date_of_birth || ''} onChange={e => set('date_of_birth', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select value={form.gender || ''} onChange={e => set('gender', e.target.value)}>
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label>Course</label>
              <select value={form.course_id || ''} onChange={e => set('course_id', e.target.value)}>
                <option value="">No course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} – {c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Year Level</label>
              <select value={form.year_level} onChange={e => set('year_level', e.target.value)}>
                {[1,2,3,4,5].map(y => <option key={y} value={y}>Year {y}</option>)}
              </select>
            </div>
            <div className="form-group full">
              <label>Address</label>
              <textarea value={form.address || ''} onChange={e => set('address', e.target.value)} rows={2} />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? 'Saving...' : 'Save Student'}</button>
        </div>
      </div>
    </div>
  );
}

const STATUS_BADGE = { active: 'badge-green', inactive: 'badge-gray', graduated: 'badge-blue', dropped: 'badge-red' };

export default function Students() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const basePath = isAdmin ? '/admin' : '/teacher';

  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [modal, setModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [sRes, cRes] = await Promise.all([
      studentAPI.getAll({ search, course_id: filterCourse }),
      courseAPI.getAll()
    ]);
    setStudents(sRes.data);
    setCourses(cRes.data);
    setLoading(false);
  }, [search, filterCourse]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    await studentAPI.delete(id);
    load();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{isAdmin ? 'All Students' : 'My Students'}</h1>
        <p className="page-subtitle">{students.length} student{students.length !== 1 ? 's' : ''} found</p>
      </div>

      <div className="toolbar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, or ID…"
          />
        </div>
        <select className="filter-select" value={filterCourse} onChange={e => setFilterCourse(e.target.value)}>
          <option value="">All Courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
        </select>
        <button className="btn btn-primary" onClick={() => setModal('add')}>+ Add Student</button>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : students.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🎓</div>
            <div className="empty-title">No students found</div>
            <div className="empty-text">Add your first student to get started</div>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Course</th>
                <th>Year</th>
                {isAdmin && <th>Teacher</th>}
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{s.student_id}</td>
                  <td>
                    <Link to={`${basePath}/students/${s.id}`} style={{ color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
                      {s.first_name} {s.last_name}
                    </Link>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.email}</td>
                  <td><span style={{ fontSize: 12 }}>{s.course_code || '—'}</span></td>
                  <td>Y{s.year_level}</td>
                  {isAdmin && <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{s.teacher_name || '—'}</td>}
                  <td><span className={`badge ${STATUS_BADGE[s.status] || 'badge-gray'}`}>{s.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="btn btn-sm btn-secondary" onClick={() => setModal(s)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(s.id, `${s.first_name} ${s.last_name}`)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <StudentModal
          student={modal === 'add' ? null : modal}
          courses={courses}
          onClose={() => setModal(null)}
          onSaved={() => { setModal(null); load(); }}
        />
      )}
    </div>
  );
}
