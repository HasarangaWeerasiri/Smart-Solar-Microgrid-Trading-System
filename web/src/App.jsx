/*
 * File: App.jsx
 * Project: Smart Solar Microgrid Trading System (SE4040)
 * Author: Lakshan
 * Created: 2026-09-22
 * Description: Routing for the web client. Public route for login, and protected sections
 *              for Backoffice and Grid Operator. Each member adds their own pages inside
 *              the section that matches their module.
 */

import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import { useAuth } from './context/AuthContext.jsx'
import BackofficeHome from './pages/BackofficeHome.jsx'
import LoginPage from './pages/LoginPage.jsx'
import OperatorHome from './pages/OperatorHome.jsx'
import PendingActivationsPage from './pages/PendingActivationsPage.jsx'
import ProsumersPage from './pages/ProsumersPage.jsx'
import UsersPage from './pages/UsersPage.jsx'
import { ROLES, homePathForRole } from './roles.js'

/**
 * Sends someone opening "/" to the right home page for their role,
 * or to the login page when nobody is signed in.
 */
function HomeRedirect() {
  const { user, isRestoring } = useAuth()

  if (isRestoring) {
    return null
  }

  const home = user ? homePathForRole(user.role) : null
  return <Navigate to={home ?? '/login'} replace />
}

/**
 * Builds the route table for the whole application.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        {/* Backoffice only */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.BACKOFFICE]} />}>
          <Route element={<Layout />}>
            <Route path="/backoffice" element={<BackofficeHome />} />
            <Route path="/backoffice/users" element={<UsersPage />} />
            <Route path="/backoffice/pending" element={<PendingActivationsPage />} />
            <Route path="/backoffice/prosumers" element={<ProsumersPage />} />
          </Route>
        </Route>

        {/* Grid Operator only */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.GRID_OPERATOR]} />}>
          <Route element={<Layout />}>
            <Route path="/operator" element={<OperatorHome />} />
          </Route>
        </Route>

        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
