import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AuthLayout } from '@/components/AuthLayout';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { FormAlert } from '@/components/FormAlert';
import { PasswordField } from '@/components/PasswordField';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { loginWithGoogle, registerWithPassword } from '@/lib/auth';
import {
  DEFAULT_POST_AUTH_PATH,
  loginPath,
  parseNextParam,
  safeReturnPath,
  saveAuthReturnPath,
} from '@/lib/authReturn';
import { createRegisterSchema, type RegisterForm } from '@/lib/authSchemas';
import {
  claimPendingInvite,
  parseRefParam,
  peekInviteCode,
  saveInviteCode,
} from '@/lib/inviteReferral';
import { useI18n } from '@/lib/i18n/LocaleProvider';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuthStore } from '@/stores/authStore';

function isHomePath(path: string): boolean {
  return path === DEFAULT_POST_AUTH_PATH || path.startsWith(`${DEFAULT_POST_AUTH_PATH}?`);
}

export function RegisterPage() {
  const { t } = useI18n();
  useDocumentTitle(t.registerDocTitle);
  const navigate = useNavigate();
  const location = useLocation();
  const setSession = useAuthStore((s) => s.setSession);
  const nextPath = parseNextParam(location.search);
  const postAuthPath = safeReturnPath(nextPath);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    const fromRef = parseRefParam(location.search);
    if (fromRef) saveInviteCode(fromRef);
  }, [location.search]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      saveAuthReturnPath(nextPath);
      await loginWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.registerErrorGoogle);
      setGoogleLoading(false);
    }
  };

  const schema = useMemo(() => createRegisterSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: RegisterForm) => {
    setError(null);
    setLoading(true);

    try {
      const inviteCode = peekInviteCode();
      const result = await registerWithPassword(
        data.email,
        data.password,
        data.display_name,
        inviteCode,
        data.website,
      );
      if (result.session) {
        setSession(result.session);
        await claimPendingInvite(result.session.access_token);
        navigate(postAuthPath, {
          replace: true,
          state: isHomePath(postAuthPath) ? { fromRegister: true } : undefined,
        });
      } else {
        navigate('/gracias', { replace: true, state: { email: data.email } });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.registerErrorGeneric);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t.registerTitle} subtitle={t.registerSubtitle}>
      <GoogleSignInButton
        loading={googleLoading}
        label={t.googleContinue}
        onClick={() => void handleGoogleSignIn()}
        className="mb-5"
      />

      <div className="mb-5 flex items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs uppercase tracking-wide text-muted-foreground">{t.authOrEmail}</span>
        <Separator className="flex-1" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="relative space-y-4">
        <div className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden" aria-hidden>
          <label htmlFor="register-website">Sitio web</label>
          <input
            id="register-website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            {...register('website')}
          />
        </div>
        <FormField label={t.authName} error={errors.display_name?.message}>
          <Input autoComplete="name" placeholder={t.authNamePlaceholder} {...register('display_name')} />
        </FormField>
        <FormField label={t.authEmail} error={errors.email?.message}>
          <Input
            type="email"
            autoComplete="email"
            placeholder={t.authEmailPlaceholder}
            {...register('email')}
          />
        </FormField>
        <FormField label={t.authPassword} error={errors.password?.message}>
          <PasswordField
            autoComplete="new-password"
            placeholder={t.authPasswordMinPlaceholder}
            {...register('password')}
          />
        </FormField>
        <FormField label={t.authConfirmPassword} error={errors.confirmPassword?.message}>
          <PasswordField
            autoComplete="new-password"
            placeholder={t.authConfirmPlaceholder}
            {...register('confirmPassword')}
          />
        </FormField>

        {error ? <FormAlert>{error}</FormAlert> : null}

        <p className="text-xs leading-relaxed text-muted-foreground">
          {t.registerAcceptPrefix}{' '}
          <Link to="/terminos" className="text-primary underline underline-offset-2">
            {t.registerAcceptTerms}
          </Link>
          ,{' '}
          <Link to="/privacidad" className="text-primary underline underline-offset-2">
            {t.registerAcceptPrivacy}
          </Link>{' '}
          {t.registerAcceptAnd}{' '}
          <Link to="/aviso-legal" className="text-primary underline underline-offset-2">
            {t.registerAcceptNotice}
          </Link>
          .
        </p>

        <Button type="submit" loading={loading} className="w-full">
          {t.registerSubmit}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {t.registerHasAccount}{' '}
        <Link to={loginPath(nextPath)} className="font-medium text-primary hover:underline">
          {t.registerLogin}
        </Link>
      </p>
    </AuthLayout>
  );
}
