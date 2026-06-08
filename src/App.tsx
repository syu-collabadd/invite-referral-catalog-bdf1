import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Catalogue from './pages/Catalogue'
import Profile from './pages/Profile'
import Products from './pages/admin/Products'
import Users from './pages/admin/Users'
import Invites from './pages/admin/Invites'
import ReferralTree from './pages/admin/ReferralTree'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/catalogue" element={<ProtectedRoute><Catalogue /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/admin/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/admin/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="/admin/invites" element={<ProtectedRoute><Invites /></ProtectedRoute>} />
          <Route path="/admin/referrals" element={<ProtectedRoute><ReferralTree /></ProtectedRoute>} />
          <Route path="/admin" element={<Navigate to="/admin/products" replace />} />
          <Route path="*" element={<Navigate to="/catalogue" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
