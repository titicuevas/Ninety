import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { CapsulesPage } from '@/pages/CapsulesPage';
import { CreateCapsulePage } from '@/pages/CreateCapsulePage';
import { EditCapsulePage } from '@/pages/EditCapsulePage';
import { FeedPage } from '@/pages/FeedPage';
import { HomePage } from '@/pages/HomePage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { FollowersPage, FollowingPage } from '@/pages/FollowListPage';
import { PublicCapsulePage } from '@/pages/PublicCapsulePage';
import { PublicProfilePage } from '@/pages/PublicProfilePage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SearchMatchPage } from '@/pages/SearchMatchPage';
import { TermsPage } from '@/pages/TermsPage';

export const appRouter = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/privacidad', element: <PrivacyPage /> },
  { path: '/terminos', element: <TermsPage /> },
  { path: '/welcome', element: <Navigate to="/" replace /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/u/:username/followers', element: <FollowersPage /> },
  { path: '/u/:username/following', element: <FollowingPage /> },
  { path: '/u/:username', element: <PublicProfilePage /> },
  { path: '/c/:id', element: <PublicCapsulePage /> },
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/feed', element: <FeedPage /> },
      { path: '/search', element: <SearchMatchPage /> },
      { path: '/capsules', element: <CapsulesPage /> },
      { path: '/capsules/new', element: <CreateCapsulePage /> },
      { path: '/capsules/:id/edit', element: <EditCapsulePage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/profile', element: <ProfilePage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
