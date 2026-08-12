import { createBrowserRouter, Navigate } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute';
import { AuthCallbackPage } from '@/pages/AuthCallbackPage';
import { CapsulesPage } from '@/pages/CapsulesPage';
import { CollectionDetailPage } from '@/pages/CollectionDetailPage';
import { CollectionsPage } from '@/pages/CollectionsPage';
import { CreateCapsulePage } from '@/pages/CreateCapsulePage';
import { EditCapsulePage } from '@/pages/EditCapsulePage';
import { ExploreCollectionsPage } from '@/pages/ExploreCollectionsPage';
import { FeedPage } from '@/pages/FeedPage';
import { ForgotPasswordPage } from '@/pages/ForgotPasswordPage';
import { HomePage } from '@/pages/HomePage';
import { InvitePage } from '@/pages/InvitePage';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { ManualMatchPage } from '@/pages/ManualMatchPage';
import { ProfilePage } from '@/pages/ProfilePage';
import { FollowersPage, FollowingPage } from '@/pages/FollowListPage';
import { CompareProfilePage } from '@/pages/CompareProfilePage';
import { PublicCapsulePage } from '@/pages/PublicCapsulePage';
import { PublicCollectionPage } from '@/pages/PublicCollectionPage';
import { PublicProfilePage } from '@/pages/PublicProfilePage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { ResetPasswordPage } from '@/pages/ResetPasswordPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SearchMatchPage } from '@/pages/SearchMatchPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { TermsPage } from '@/pages/TermsPage';

export const appRouter = createBrowserRouter([
  { path: '/', element: <LandingPage /> },
  { path: '/privacidad', element: <PrivacyPage /> },
  { path: '/terminos', element: <TermsPage /> },
  { path: '/privacy', element: <Navigate to="/privacidad" replace /> },
  { path: '/terms', element: <Navigate to="/terminos" replace /> },
  { path: '/welcome', element: <Navigate to="/" replace /> },
  { path: '/auth/callback', element: <AuthCallbackPage /> },
  { path: '/auth/reset-password', element: <ResetPasswordPage /> },
  { path: '/u/:username/followers', element: <FollowersPage /> },
  { path: '/u/:username/following', element: <FollowingPage /> },
  { path: '/u/:username/vs', element: <CompareProfilePage /> },
  { path: '/u/:username/lists/:slug', element: <PublicCollectionPage /> },
  { path: '/u/:username', element: <PublicProfilePage /> },
  { path: '/c/:id', element: <PublicCapsulePage /> },
  { path: '/invite/:code', element: <InvitePage /> },
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/home', element: <HomePage /> },
      { path: '/feed', element: <FeedPage /> },
      { path: '/search', element: <SearchMatchPage /> },
      { path: '/search/manual', element: <ManualMatchPage /> },
      { path: '/capsules', element: <CapsulesPage /> },
      { path: '/capsules/new', element: <CreateCapsulePage /> },
      { path: '/capsules/:id/edit', element: <EditCapsulePage /> },
      { path: '/collections', element: <CollectionsPage /> },
      { path: '/collections/explore', element: <ExploreCollectionsPage /> },
      { path: '/collections/:id', element: <CollectionDetailPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/profile', element: <ProfilePage /> },
      { path: '/settings', element: <SettingsPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
