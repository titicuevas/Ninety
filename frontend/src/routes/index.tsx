import { Routes, Route, Navigate } from 'react-router-dom';
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
import { PublicCapsulePage } from '@/pages/PublicCapsulePage';
import { PublicProfilePage } from '@/pages/PublicProfilePage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { SearchMatchPage } from '@/pages/SearchMatchPage';
import { TermsPage } from '@/pages/TermsPage';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacidad" element={<PrivacyPage />} />
      <Route path="/terminos" element={<TermsPage />} />
      <Route path="/welcome" element={<Navigate to="/" replace />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      <Route path="/u/:username" element={<PublicProfilePage />} />
      <Route path="/c/:id" element={<PublicCapsulePage />} />

      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route path="/home" element={<HomePage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/search" element={<SearchMatchPage />} />
        <Route path="/capsules" element={<CapsulesPage />} />
        <Route path="/capsules/new" element={<CreateCapsulePage />} />
        <Route path="/capsules/:id/edit" element={<EditCapsulePage />} />
        <Route path="/profile" element={<ProfilePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
