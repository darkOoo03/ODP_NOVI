import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './hooks/useAuth';

// Components & Layouts
import Layout from './components/Layout';

// Public Pages
import Home from './pages/Home';
import Guide from './pages/Guide';
import Login from './pages/Login';
import Register from './pages/Register';

// Protected Pages
import Dashboard from './pages/Dashboard';
import HiveList from './pages/Hives/HiveList';
import HiveDetails from './pages/Hives/HiveDetails';
import QueenList from './pages/Queens/QueenList';
import QueenDetails from './pages/Queens/QueenDetails';
import AssignmentList from './pages/Assignments/AssignmentList';
import QualityCheckList from './pages/QualityChecks/QualityCheckList';
import Ranking from './pages/Ranking';
import Profile from './pages/Profile';

// Admin Pages
import AdminDashboard from './pages/Admin/AdminDashboard';

// Route guards
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="loading-state-fullscreen">Učitavanje...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <div className="loading-state-fullscreen">Učitavanje...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<Home />} />
          <Route path="/guide" element={<Guide />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Beekeeper Routes */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/hives" 
            element={
              <ProtectedRoute>
                <HiveList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/hives/:id" 
            element={
              <ProtectedRoute>
                <HiveDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/queens" 
            element={
              <ProtectedRoute>
                <QueenList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/queens/:id" 
            element={
              <ProtectedRoute>
                <QueenDetails />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/assignments" 
            element={
              <ProtectedRoute>
                <AssignmentList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/quality-checks" 
            element={
              <ProtectedRoute>
                <QualityCheckList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ranking" 
            element={
              <ProtectedRoute>
                <Ranking />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />

          {/* Admin Protected Routes */}
          <Route 
            path="/admin" 
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            } 
          />

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
