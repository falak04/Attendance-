import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import LoginPage from './components/auth/LoginPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AdminDashboard from "./components/admin/AdminDashboard"
import HodDashboard from "./components/hod/HodDashboard"
import StudentDashboard from "./components/student/StudentDashboard"
import TeacherDashboard from "./components/teacher/TeacherDashboard"

import ThemeProvider from "./components/ThemeProvider"
import Unauthorized from './components/auth/Unauthorized';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <div className="min-h-screen bg-white dark:bg-gray-900">
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            
            {/* Protected routes for admin */}
            <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>
            
            {/* Protected routes for HOD */}
            <Route element={<ProtectedRoute allowedRoles={['hod']} />}>
              <Route path="/hod" element={<HodDashboard />} />
            </Route>
            
            {/* Protected routes for teachers */}
            <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
              <Route path="/teacher" element={<TeacherDashboard />} />
            </Route>
            
            {/* Protected routes for students */}
            <Route element={<ProtectedRoute allowedRoles={['student']} />}>
              <Route path="/student" element={<StudentDashboard />} />
            </Route>
            
            {/* Redirect root to login or dashboard based on auth */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch-all route for undefined paths */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App