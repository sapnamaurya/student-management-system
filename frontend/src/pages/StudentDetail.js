import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { studentAPI, gradeAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function GradeModal({ studentId, grade, onClose, onSaved }) {
  const [form, setForm] = useState(grade || { subject: '', grade: '', units: 3, semester: '', remarks: '' });
  const [error, setError] = useState('');
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.subject || form.grade === '') { setError('Subject and grade are required.'); return; }
    try {
      if (grade?.id) await gradeAPI.update(grade.id, form);
      else await gradeAPI.create({ ...form, student_id: studentId });
      onSaved();
    } catch { setError('Save failed'); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <span className="modal-title">{grade ? 'Edit Grade' : 'Add Grade'}</span>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error">{error}</div>}
          <div className="form-grid">
            <div className="form-group full">
              <label>Subject *</label>
              <input value={form.subject} onChange={e => set('subject', e.target.value)} placeholder="e.g. Data Structures" />
            </div>
            <div className="form-group">
              <label>Grade * (0–100)</label>
              <input type="number" min="0" max="100" step="0.1" value={form.grade} onChange={e => set('grade', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Units</label>
              <input type="number" min="1" max="6" value={form.units} onChange={e => set('units', e.target.value)} />
            </div>
            <div className="form-group full">
              <label>Semester</label>
              <input value={form.semester} onChange={e => set('semester', e.target.value)} placeholder="e.g. 2026-1st" />
            </div>
            <div className="form-group full">
              <label>Remarks</label>
              <input value={form.remarks || ''} onChange={e => set('remarks', e.target.value)} placeholder="Excellent, Pass, etc." />
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={submit}>Save Grade</button>
        </div>
      </div>
    </div>
  );
}

function gradeColor(g) {
  if (g >= 90) return '#059669';
  if (g >= 75) return '#2563EB';
  if (g >= 60) return '#D97706';
  return '#DC2626';
}

export default function StudentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const basePath = user?.role === 'admin' ? '/admin' : '/teacher';

  const [student, setStudent] = useState(null);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeModal, setGradeModal] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const load = async () => {
    try {
      const [sRes, gRes] = await Promise.all([
        studentAPI.getOne(id),
        gradeAPI.getAll({ student_id: id })
      ]);
      setStudent(sRes.data);
      setGrades(gRes.data);
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const deleteGrade = async (gid) => {
    if (!window.confirm('Delete this grade record?')) return;
    await gradeAPI.delete(gid);
    load();
  };

  const generateAiSummary = async () => {
    setAiLoading(true);
    setAiError('');
    setAiSummary('');
    try {
      const res = await aiAPI.studentSummary(student.id);
      setAiSummary(res.data.summary);
    } catch (e) {
      setAiError(e.response?.data?.error || 'Failed to generate AI summary. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (notFound || !student) return <div className="page"><div className="alert alert-error">Student not found or access denied.</div></div>;

  const avg = grades.length ? (grades.reduce((s, g) => s + parseFloat(g.grade), 0) / grades.length).toFixed(2) : null;
  const initials = `${student.first_name[0]}${student.last_name[0]}`.toUpperCase();

  return (
    <div className="page">
      <div style={{ marginBottom: 16 }}>
        <button className="btn btn-secondary btn-sm" onClick={() => navigate(`${basePath}/students`)}>← Back to Students</button>
      </div>

      <div className="detail-header">
        <div className="avatar">{initials}</div>
        <div className="detail-info">
          <div className="detail-name">{student.first_name} {student.last_name}</div>
          <div className="detail-meta">
            <span>🪪 {student.student_id}</span>
            <span>✉️ {student.email}</span>
            {student.course_code && <span>📚 {student.course_code} · Year {student.year_level}</span>}
            {user?.role === 'admin' && student.teacher_name && <span>🧑‍🏫 {student.teacher_name}</span>}
            <span className={`badge badge-${student.status === 'active' ? 'green' : 'gray'}`}>{student.status}</span>
          </div>
        </div>
        {avg && (
          <div style={{ textAlign: 'center', padding: '12px 20px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: 28, fontWeight: 700, color: gradeColor(avg) }}>{avg}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>GPA Average</div>
          </div>
        )}
      </div>

      <div className="info-grid">
        {[
          ['Phone', student.phone || '—'],
          ['Gender', student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '—'],
          ['Date of Birth', student.date_of_birth || '—'],
          ['Course', student.course_name || '—'],
          ['Address', student.address || '—'],
        ].map(([label, val]) => (
          <div className="card" key={label} style={{ padding: '14px 18px' }}>
            <div className="info-item"><label>{label}</label><span>{val}</span></div>
          </div>
        ))}
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">✨ AI Performance Summary</span>
          <button className="btn btn-primary btn-sm" onClick={generateAiSummary} disabled={aiLoading || grades.length === 0}>
            {aiLoading ? 'Generating…' : aiSummary ? 'Regenerate' : 'Generate Summary'}
          </button>
        </div>
        <div className="card-body">
          {grades.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Add at least one grade to generate an AI summary.</p>
          ) : aiLoading ? (
            <div className="loading" style={{ padding: 20 }}><div className="spinner"></div></div>
          ) : aiError ? (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>{aiError}</div>
          ) : aiSummary ? (
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-primary)', whiteSpace: 'pre-line' }}>{aiSummary}</p>
          ) : (
            <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Click "Generate Summary" to get an AI-written analysis of this student's academic performance.</p>
          )}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Grade Records ({grades.length})</span>
          <button className="btn btn-primary btn-sm" onClick={() => setGradeModal('add')}>+ Add Grade</button>
        </div>
        {grades.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">No grades yet</div>
            <div className="empty-text">Add the first grade record for this student</div>
          </div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none', borderTop: '1px solid var(--border)' }}>
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Grade</th>
                  <th>Units</th>
                  <th>Semester</th>
                  <th>Remarks</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grades.map(g => (
                  <tr key={g.id}>
                    <td style={{ fontWeight: 500 }}>{g.subject}</td>
                    <td><span style={{ fontWeight: 700, color: gradeColor(g.grade) }}>{g.grade}</span></td>
                    <td>{g.units}</td>
                    <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{g.semester || '—'}</td>
                    <td>{g.remarks || '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-sm btn-secondary" onClick={() => setGradeModal(g)}>Edit</button>
                        <button className="btn btn-sm btn-danger" onClick={() => deleteGrade(g.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {gradeModal && (
        <GradeModal
          studentId={student.id}
          grade={gradeModal === 'add' ? null : gradeModal}
          onClose={() => setGradeModal(null)}
          onSaved={() => { setGradeModal(null); load(); }}
        />
      )}
    </div>
  );
}
