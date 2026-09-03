export function bearerTokenFromAuthorization(authorization: string | undefined): string | null {
  if (!authorization) return null;
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim());
  const token = match?.[1]?.trim();
  return token || null;
}

export function getBearerToken(req: { headers: { authorization?: string } }): string | null {
  return bearerTokenFromAuthorization(req.headers.authorization);
}

export function firstRouteParam(value: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? '') : value;
}
