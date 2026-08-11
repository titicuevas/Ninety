/** Badge compacto cuando el perfil sigue al viewer. */
export function FollowsYouBadge({ className }: { className?: string }) {
  return (
    <span
      data-testid="follows-you-badge"
      className={
        className ??
        'inline-flex items-center rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground'
      }
    >
      Te sigue
    </span>
  );
}
