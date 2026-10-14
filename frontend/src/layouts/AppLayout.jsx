import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Zap, BarChart2, Brain, AlertTriangle,
  Lightbulb, Target, FileText, Settings, LogOut, Menu, X, Leaf
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',      label: 'Dashboard',      Icon: LayoutDashboard },
  { to: '/energy',         label: 'Energy Records', Icon: Zap },
  { to: '/analytics',      label: 'Analytics',      Icon: BarChart2 },
  { to: '/forecast',       label: 'AI Forecast',    Icon: Brain },
  { to: '/anomalies',      label: 'Anomalies',      Icon: AlertTriangle },
  { to: '/recommendations',label: 'Recommendations',Icon: Lightbulb },
  { to: '/goals',          label: 'Goals',          Icon: Target },
  { to: '/reports',        label: 'Reports',        Icon: FileText },
  { to: '/settings',       label: 'Settings',       Icon: Settings },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 flex flex-col w-64 bg-white border-r border-gray-200
        transform transition-transform duration-200
        lg:static lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-200">
          <Leaf className="h-7 w-7 text-brand-600" />
          <div>
            <span className="font-bold text-gray-900 text-lg">WattWise</span>
            <span className="text-brand-600 font-bold text-lg"> AI</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-3">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors
                 ${isActive
                   ? 'bg-brand-50 text-brand-700'
                   : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                 }`
              }
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full bg-brand-600 text-white flex items-center justify-center text-sm font-bold">
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn-secondary w-full justify-center text-xs py-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header className="lg:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Leaf className="h-5 w-5 text-brand-600" />
            <span className="font-bold text-gray-900">WattWise AI</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
