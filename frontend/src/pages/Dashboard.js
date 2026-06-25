import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { statsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    statsAPI.get().then(r => { setStats(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!stats) return <div className="page"><p>Could not load dashboard. Make sure Flask is running.</p></div>;

  const genderData = stats.gender_distribution?.filter(g => g.gender).map(g => ({
    name: g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
    value: g.count
  })) || [];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">
          {isAdmin ? 'Admin Dashboard' : `Welcome back, ${user?.full_name?.split(' ')[0]}`}
        </h1>
        <p className="page-subtitle">
          {isAdmin ? 'Full system overview across all teachers and courses' : 'Overview of your students and classes'}
        </p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">🎓</div>
          <div>
            <div className="stat-value">{stats.total_students}</div>
            <div className="stat-label">{isAdmin ? 'Total Students' : 'My Students'}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div>
            <div className="stat-value">{stats.active_students}</div>
            <div className="stat-label">Active Students</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📚</div>
          <div>
            <div className="stat-value">{stats.total_courses}</div>
            <div className="stat-label">{isAdmin ? 'Courses Offered' : 'My Courses'}</div>
          </div>
        </div>
        {isAdmin ? (
          <div className="stat-card">
            <div className="stat-icon amber">👤</div>
            <div>
              <div className="stat-value">{stats.total_teachers}</div>
              <div className="stat-label">Teachers</div>
            </div>
          </div>
        ) : (
          <div className="stat-card">
            <div className="stat-icon amber">⭐</div>
            <div>
              <div className="stat-value">{stats.avg_grade || '—'}</div>
              <div className="stat-label">Average Grade</div>
            </div>
          </div>
        )}
      </div>

      <div className="charts-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Enrollment by Course</span>
          </div>
          <div className="card-body">
            {stats.top_courses?.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={stats.top_courses} margin={{ top: 5, right: 10, left: -20, bottom: 60 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Students" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No data yet</div></div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Gender Distribution</span>
          </div>
          <div className="card-body">
            {genderData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-state"><div className="empty-icon">👥</div><div className="empty-title">No data yet</div></div>
            )}
          </div>
        </div>
      </div>

      {isAdmin && stats.teacher_stats?.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div className="card-header">
            <span className="card-title">Students per Teacher</span>
          </div>
          <div className="table-wrap" style={{ border: 'none', borderTop: '1px solid var(--border)' }}>
            <table>
              <thead>
                <tr><th>Teacher</th><th>Students Assigned</th></tr>
              </thead>
              <tbody>
                {stats.teacher_stats.map((t, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{t.full_name}</td>
                    <td><span className="badge badge-blue">{t.count}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
