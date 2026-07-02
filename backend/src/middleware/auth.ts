import type { NextFunction, Request, Response } from 'express';
import { supabaseAnon } from '../lib/supabase.js';

export interface AuthRequest extends Request {
  userId?: string;
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({ error: 'Token requerido' });
    return;
  }

  const { data, error } = await supabaseAnon.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Token inválido' });
    return;
  }

  req.userId = data.user.id;
  next();
}
