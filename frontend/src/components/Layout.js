import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const adminNav = [
    { path: '/admin', icon: '⊞', label: 'Dashboard', end: true },
    { path: '/admin/students', icon: '🎓', label: 'Students' },
    { path: '/admin/courses', icon: '📚', label: 'Courses' },
    { path: '/admin/grades', icon: '📊', label: 'Grades' },
    { path: '/admin/teachers', icon: '👤', label: 'Teachers' },
  ];

  const teacherNav = [
    { path: '/teacher', icon: '⊞', label: 'Dashboard', end: true },
    { path: '/teacher/students', icon: '🎓', label: 'My Students' },
    { path: '/teacher/courses', icon: '📚', label: 'My Courses' },
    { path: '/teacher/grades', icon: '📊', label: 'Grades' },
  ];

  const nav = user?.role === 'admin' ? adminNav : teacherNav;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className={`app-shell ${collapsed ? 'collapsed' : ''}`}>
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="logo-mark">SMS</div>
          {!collapsed && <span className="logo-text">ScholarTrack</span>}
          <button className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? '→' : '←'}
          </button>
        </div>
        <nav className="sidebar-nav">
          {nav.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              {!collapsed && <span className="nav-label">{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        {!collapsed && (
          <div className="sidebar-footer">
            <div className="role-pill">{user?.role === 'admin' ? '🛡️ Administrator' : '🧑‍🏫 Teacher'}</div>
          </div>
        )}
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <div className="topbar-spacer" />
          <div className="topbar-user" onClick={() => setMenuOpen(!menuOpen)}>
            <div className="avatar-sm">{user?.avatar_initials || user?.full_name?.[0] || 'U'}</div>
            <div className="topbar-user-info">
              <span className="topbar-name">{user?.full_name}</span>
              <span className="topbar-role">{user?.role}</span>
            </div>
            <span className="topbar-caret">▾</span>
            {menuOpen && (
              <div className="user-menu" onMouseLeave={() => setMenuOpen(false)}>
                <div className="user-menu-item user-menu-header">
                  <strong>{user?.full_name}</strong>
                  <span>{user?.email}</span>
                </div>
                <button className="user-menu-item user-menu-logout" onClick={handleLogout}>
                  ⏻ Sign Out
                </button>
              </div>
            )}
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
