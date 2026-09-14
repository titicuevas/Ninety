import type { NextFunction, Response } from 'express';
import { isMissingProfileColumn } from '../lib/profileLookup.js';
import { supabaseAdmin } from '../lib/supabase.js';
import type { AuthRequest } from './auth.js';

/**
 * Requiere requireAuth antes. Comprueba profiles.is_admin con service role
 * (no confiar en user_metadata ni en el JWT del cliente).
 */
export async function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userId) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  if (!supabaseAdmin) {
    res.status(503).json({ error: 'Admin no disponible (falta service role)' });
    return;
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('is_admin')
    .eq('id', req.userId)
    .maybeSingle();

  if (error) {
    if (isMissingProfileColumn(error, 'is_admin')) {
      res.status(503).json({
        error:
          'Esquema sin is_admin. Ejecuta supabase/migrations/20260914120000_profiles_is_admin.sql',
      });
      return;
    }
    res.status(503).json({ error: 'No se pudo verificar privilegios admin' });
    return;
  }

  if (!data?.is_admin) {
    res.status(403).json({ error: 'Se requieren privilegios de administrador' });
    return;
  }

  next();
}
