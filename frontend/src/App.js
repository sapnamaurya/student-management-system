import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Students from './pages/Students';
import StudentDetail from './pages/StudentDetail';
import Courses from './pages/Courses';
import Grades from './pages/Grades';
import Teachers from './pages/admin/Teachers';

import './App.css';

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading" style={{ minHeight: '100vh' }}><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/teacher'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/" element={<RootRedirect />} />

          {/* Admin routes */}
          <Route path="/admin" element={<ProtectedRoute role="admin"><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="courses" element={<Courses />} />
            <Route path="grades" element={<Grades />} />
            <Route path="teachers" element={<Teachers />} />
          </Route>

          {/* Teacher routes */}
          <Route path="/teacher" element={<ProtectedRoute role="teacher"><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="students/:id" element={<StudentDetail />} />
            <Route path="courses" element={<Courses />} />
            <Route path="grades" element={<Grades />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
