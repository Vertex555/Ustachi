import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, PublicOnlyRoute } from './guards';

import PublicLayout from '../layouts/PublicLayout';
import UserLayout from '../layouts/UserLayout';

import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/RegisterPage';
import VerifyPage from '../pages/VerifyPage';
import MastersPage from '../pages/MastersPage';
import MasterProfilePage from '../pages/MasterProfilePage';
import MasterDashboardPage from '../pages/master/MasterDashboardPage';
import NotFoundPage from '../pages/NotFoundPage';

export const appRouter = createBrowserRouter([
  {
    path: '/',
    element: <PublicLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'masters', element: <MastersPage /> },
      { path: 'masters/:id', element: <MasterProfilePage /> },
      {
        path: 'login',
        element: (
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'register',
        element: (
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        ),
      },
      {
        path: 'verify',
        element: <VerifyPage />,
      },
      {
        path: 'account',
        element: (
          <ProtectedRoute>
            <UserLayout />
          </ProtectedRoute>
        ),
        children: [
          { index: true, element: <Navigate to="/account/dashboard" replace /> },
          { path: 'dashboard', element: <div className="content">User dashboard</div> },
        ],
      },
      {
        path: 'master',
        element: (
          <RoleRoute roles={['master', 'admin']}>
            <MasterDashboardPage />
          </RoleRoute>
        ),
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);

export default appRouter;
