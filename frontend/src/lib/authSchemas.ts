import { z } from 'zod';

export const passwordFieldSchema = z.string().min(6, 'Mínimo 6 caracteres');

/** Cambio / reset de contraseña (password + confirm). */
export const passwordConfirmSchema = z
  .object({
    password: passwordFieldSchema,
    confirm: passwordFieldSchema,
  })
  .refine((v) => v.password === v.confirm, {
    message: 'Las contraseñas no coinciden',
    path: ['confirm'],
  });

export type PasswordConfirmForm = z.infer<typeof passwordConfirmSchema>;

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: passwordFieldSchema,
});

export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    display_name: z.string().min(2, 'Mínimo 2 caracteres'),
    email: z.string().email('Email inválido'),
    password: passwordFieldSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export type RegisterForm = z.infer<typeof registerSchema>;
