import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', password: '', confirm: '', role: 'teacher'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.full_name || !form.username || !form.email || !form.password) {
      setError('All fields are required.'); return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.'); return;
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.'); return;
    }
    setLoading(true);
    try {
      await register({
        full_name: form.full_name, username: form.username,
        email: form.email, password: form.password, role: form.role
      });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (e) {
      setError(e.response?.data?.error || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-bg-pattern"></div>
      <div className="auth-card">
        <div className="auth-brand">
          <div className="logo-mark">SMS</div>
          <span className="auth-brand-text">ScholarTrack</span>
        </div>
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-subtitle">Join as an Administrator or Teacher</p>

        {error && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">Account created! Redirecting to login…</div>}

        <form onSubmit={submit} className="auth-form">
          <div className="form-group full">
            <label>Full Name</label>
            <input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Juan Dela Cruz" />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Username</label>
              <input value={form.username} onChange={e => set('username', e.target.value)} placeholder="jdcruz" />
            </div>
            <div className="form-group">
              <label>Role</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="form-group full">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@school.edu" />
          </div>
          <div className="form-grid">
            <div className="form-group">
              <label>Password</label>
              <input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" value={form.confirm} onChange={e => set('confirm', e.target.value)} placeholder="••••••••" />
            </div>
          </div>
          <button className="btn btn-primary btn-block" type="submit" disabled={loading || success}>
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
