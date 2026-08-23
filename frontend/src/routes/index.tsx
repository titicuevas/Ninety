import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute, GuestRoute } from '@/components/ProtectedRoute';
import { RouteErrorFallback } from '@/components/RootErrorFallback';

function RouteErrorProbe(): never {
  throw new Error('Fallo E2E controlado del router');
}

const developmentOnlyRoutes = import.meta.env.DEV
  ? [{ path: '/__e2e/route-error', element: <RouteErrorProbe /> }]
  : [];

export const appRouter = createBrowserRouter([
  {
    element: <Outlet />,
    errorElement: <RouteErrorFallback />,
    children: [
  ...developmentOnlyRoutes,
  { path: '/', lazy: () => import('@/pages/LandingPage').then((m) => ({ Component: m.LandingPage })) },
  { path: '/privacidad', lazy: () => import('@/pages/PrivacyPage').then((m) => ({ Component: m.PrivacyPage })) },
  { path: '/terminos', lazy: () => import('@/pages/TermsPage').then((m) => ({ Component: m.TermsPage })) },
  { path: '/gracias', lazy: () => import('@/pages/ThankYouPage').then((m) => ({ Component: m.ThankYouPage })) },
  { path: '/privacy', element: <Navigate to="/privacidad" replace /> },
  { path: '/terms', element: <Navigate to="/terminos" replace /> },
  { path: '/welcome', element: <Navigate to="/" replace /> },
  { path: '/auth/callback', lazy: () => import('@/pages/AuthCallbackPage').then((m) => ({ Component: m.AuthCallbackPage })) },
  { path: '/auth/reset-password', lazy: () => import('@/pages/ResetPasswordPage').then((m) => ({ Component: m.ResetPasswordPage })) },
  { path: '/u/:username/followers', lazy: () => import('@/pages/FollowListPage').then((m) => ({ Component: m.FollowersPage })) },
  { path: '/u/:username/following', lazy: () => import('@/pages/FollowListPage').then((m) => ({ Component: m.FollowingPage })) },
  { path: '/u/:username/vs', lazy: () => import('@/pages/CompareProfilePage').then((m) => ({ Component: m.CompareProfilePage })) },
  { path: '/u/:username/lists/:slug', lazy: () => import('@/pages/PublicCollectionPage').then((m) => ({ Component: m.PublicCollectionPage })) },
  { path: '/u/:username/calendar/:year/:month', lazy: () => import('@/pages/PublicDiaryMonthPage').then((m) => ({ Component: m.PublicDiaryMonthPage })) },
  { path: '/u/:username/want-to-go', lazy: () => import('@/pages/PublicWantToGoPage').then((m) => ({ Component: m.PublicWantToGoPage })) },
  { path: '/u/:username', lazy: () => import('@/pages/PublicProfilePage').then((m) => ({ Component: m.PublicProfilePage })) },
  { path: '/c/:id', lazy: () => import('@/pages/PublicCapsulePage').then((m) => ({ Component: m.PublicCapsulePage })) },
  { path: '/invite/:code', lazy: () => import('@/pages/InvitePage').then((m) => ({ Component: m.InvitePage })) },
  {
    element: <GuestRoute />,
    children: [
      { path: '/login', lazy: () => import('@/pages/LoginPage').then((m) => ({ Component: m.LoginPage })) },
      { path: '/register', lazy: () => import('@/pages/RegisterPage').then((m) => ({ Component: m.RegisterPage })) },
      { path: '/forgot-password', lazy: () => import('@/pages/ForgotPasswordPage').then((m) => ({ Component: m.ForgotPasswordPage })) },
    ],
  },
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/home', lazy: () => import('@/pages/HomePage').then((m) => ({ Component: m.HomePage })) },
      { path: '/feed', lazy: () => import('@/pages/FeedPage').then((m) => ({ Component: m.FeedPage })) },
      { path: '/activity', lazy: () => import('@/pages/ActivityPage').then((m) => ({ Component: m.ActivityPage })) },
      { path: '/search', lazy: () => import('@/pages/SearchMatchPage').then((m) => ({ Component: m.SearchMatchPage })) },
      { path: '/search/manual', lazy: () => import('@/pages/ManualMatchPage').then((m) => ({ Component: m.ManualMatchPage })) },
      { path: '/capsules', lazy: () => import('@/pages/CapsulesPage').then((m) => ({ Component: m.CapsulesPage })) },
      { path: '/capsules/new', lazy: () => import('@/pages/CreateCapsulePage').then((m) => ({ Component: m.CreateCapsulePage })) },
      { path: '/capsules/:id/edit', lazy: () => import('@/pages/EditCapsulePage').then((m) => ({ Component: m.EditCapsulePage })) },
      { path: '/likes', lazy: () => import('@/pages/LikesPage').then((m) => ({ Component: m.LikesPage })) },
      { path: '/diary/calendar', lazy: () => import('@/pages/DiaryCalendarPage').then((m) => ({ Component: m.DiaryCalendarPage })) },
      { path: '/collections', lazy: () => import('@/pages/CollectionsPage').then((m) => ({ Component: m.CollectionsPage })) },
      { path: '/collections/explore', lazy: () => import('@/pages/ExploreCollectionsPage').then((m) => ({ Component: m.ExploreCollectionsPage })) },
      { path: '/collections/likes', lazy: () => import('@/pages/LikedCollectionsPage').then((m) => ({ Component: m.LikedCollectionsPage })) },
      { path: '/collections/:id', lazy: () => import('@/pages/CollectionDetailPage').then((m) => ({ Component: m.CollectionDetailPage })) },
      { path: '/want-to-go', lazy: () => import('@/pages/WantToGoPage').then((m) => ({ Component: m.WantToGoPage })) },
      { path: '/teams/:slug', lazy: () => import('@/pages/TeamPage').then((m) => ({ Component: m.TeamPage })) },
      { path: '/notifications', lazy: () => import('@/pages/NotificationsPage').then((m) => ({ Component: m.NotificationsPage })) },
      { path: '/profile', lazy: () => import('@/pages/ProfilePage').then((m) => ({ Component: m.ProfilePage })) },
      { path: '/settings', lazy: () => import('@/pages/SettingsPage').then((m) => ({ Component: m.SettingsPage })) },
    ],
  },
      { path: '*', lazy: () => import('@/pages/NotFoundPage').then((m) => ({ Component: m.NotFoundPage })) },
    ],
  },
]);
