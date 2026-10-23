import { z } from 'zod';
import type { Messages } from '@/lib/i18n/types';

type ValidationCopy = Pick<
  Messages,
  | 'validationEmailInvalid'
  | 'validationPasswordRequired'
  | 'validationPasswordMin'
  | 'validationPasswordMax'
  | 'validationPasswordMismatch'
  | 'validationNameMin'
>;

const defaultCopy: ValidationCopy = {
  validationEmailInvalid: 'Email inválido',
  validationPasswordRequired: 'Introduce tu contraseña',
  validationPasswordMin: 'Mínimo 10 caracteres',
  validationPasswordMax: 'Máximo 72 caracteres',
  validationPasswordMismatch: 'Las contraseñas no coinciden',
  validationNameMin: 'Mínimo 2 caracteres',
};

/** Registro / reset / cambio en Ajustes. */
function passwordFieldSchema(copy: ValidationCopy) {
  return z
    .string()
    .min(10, copy.validationPasswordMin)
    .max(72, copy.validationPasswordMax);
}

/** Login: no bloquear cuentas antiguas con contraseñas cortas. */
function loginPasswordSchema(copy: ValidationCopy) {
  return z.string().min(1, copy.validationPasswordRequired).max(72);
}

/** Cambio / reset de contraseña (password + confirm). */
export function createPasswordConfirmSchema(copy: ValidationCopy = defaultCopy) {
  return z
    .object({
      password: passwordFieldSchema(copy),
      confirm: passwordFieldSchema(copy),
    })
    .refine((v) => v.password === v.confirm, {
      message: copy.validationPasswordMismatch,
      path: ['confirm'],
    });
}

export const passwordConfirmSchema = createPasswordConfirmSchema();

export type PasswordConfirmForm = z.infer<typeof passwordConfirmSchema>;

export function createLoginSchema(copy: ValidationCopy = defaultCopy) {
  return z.object({
    email: z.string().email(copy.validationEmailInvalid),
    password: loginPasswordSchema(copy),
  });
}

export type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;

export function createRegisterSchema(copy: ValidationCopy = defaultCopy) {
  return z
    .object({
      display_name: z.string().min(2, copy.validationNameMin),
      email: z.string().email(copy.validationEmailInvalid),
      password: passwordFieldSchema(copy),
      confirmPassword: z.string(),
      /** Honeypot: debe quedar vacío (anti-bots). */
      website: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: copy.validationPasswordMismatch,
      path: ['confirmPassword'],
    });
}

export type RegisterForm = z.infer<ReturnType<typeof createRegisterSchema>>;

export function createForgotPasswordSchema(copy: ValidationCopy = defaultCopy) {
  return z.object({
    email: z.string().email(copy.validationEmailInvalid),
  });
}
