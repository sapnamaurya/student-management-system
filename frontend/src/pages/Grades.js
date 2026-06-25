import React, { useEffect, useState, useCallback } from 'react';
import { gradeAPI, studentAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

function gradeColor(g) {
  if (g >= 90) return 'badge-green';
  if (g >= 75) return 'badge-blue';
  if (g >= 60) return 'badge-amber';
  return 'badge-red';
}

export default function Grades() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [grades, setGrades] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStudent, setFilterStudent] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [gRes, sRes] = await Promise.all([
      gradeAPI.getAll(filterStudent ? { student_id: filterStudent } : {}),
      studentAPI.getAll({})
    ]);
    setGrades(gRes.data);
    setStudents(sRes.data);
    setLoading(false);
  }, [filterStudent]);

  useEffect(() => { load(); }, [load]);

  const avgGrade = grades.length ? (grades.reduce((s, g) => s + parseFloat(g.grade), 0) / grades.length).toFixed(2) : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">{isAdmin ? 'All Grades' : 'My Students\' Grades'}</h1>
        <p className="page-subtitle">{grades.length} grade record{grades.length !== 1 ? 's' : ''}{avgGrade ? ` · Average: ${avgGrade}` : ''}</p>
      </div>

      <div className="toolbar">
        <select
          className="filter-select"
          value={filterStudent}
          onChange={e => setFilterStudent(e.target.value)}
          style={{ minWidth: 220 }}
        >
          <option value="">All Students</option>
          {students.map(s => (
            <option key={s.id} value={s.id}>{s.student_id} – {s.first_name} {s.last_name}</option>
          ))}
        </select>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          To add grades, go to the student's detail page
        </span>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner"></div></div>
      ) : grades.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <div className="empty-title">No grade records</div>
            <div className="empty-text">Add grades from the Student detail page</div>
          </div>
        </div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Student Name</th>
                <th>Subject</th>
                <th>Grade</th>
                <th>Units</th>
                <th>Semester</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              {grades.map(g => (
                <tr key={g.id}>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{g.student_code}</td>
                  <td style={{ fontWeight: 500 }}>{g.first_name} {g.last_name}</td>
                  <td>{g.subject}</td>
                  <td><span className={`badge ${gradeColor(g.grade)}`}>{g.grade}</span></td>
                  <td style={{ color: 'var(--text-secondary)' }}>{g.units}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{g.semester || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{g.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
