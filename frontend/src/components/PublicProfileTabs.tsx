import type React from 'react';
import { BarChart3, CalendarDays, Library, ListChecks } from 'lucide-react';
import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';

export type ProfileTab = 'diary' | 'lists' | 'wantogo' | 'stats';

const TAB_ITEMS: { id: ProfileTab; label: string; icon: React.ElementType }[] = [
  { id: 'diary', label: 'Diario', icon: CalendarDays },
  { id: 'lists', label: 'Listas', icon: Library },
  { id: 'wantogo', label: 'Quiero ir', icon: ListChecks },
  { id: 'stats', label: 'Stats', icon: BarChart3 },
];

export function PublicProfileTabs({
  active,
  onChange,
  hasCollections,
  hasWantToGo,
  hasStats,
}: {
  active: ProfileTab;
  onChange: (tab: ProfileTab) => void;
  hasCollections: boolean;
  hasWantToGo: boolean;
  hasStats: boolean;
}) {
  const visibleTabs = TAB_ITEMS.filter((tab) => {
    if (tab.id === 'lists' && !hasCollections) return false;
    if (tab.id === 'wantogo' && !hasWantToGo) return false;
    if (tab.id === 'stats' && !hasStats) return false;
    return true;
  });

  if (visibleTabs.length <= 1) return null;

  return (
    <nav className="flex gap-1 rounded-xl bg-secondary/50 p-1" role="tablist" aria-label="Secciones del perfil">
      {visibleTabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.id)}
            className={`flex flex-1 items-center justify-center gap-1 rounded-lg px-1.5 py-2.5 text-xs font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm ${
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export function PublicDiaryEmptyState({ isOwnProfile }: { isOwnProfile: boolean }) {
  return (
    <EmptyState
      title={isOwnProfile ? 'Aún no has guardado partidos' : 'Diario vacío'}
      description={
        isOwnProfile
          ? 'Busca un partido que hayas visto y empieza tu diario.'
          : 'Este aficionado aún no ha publicado partidos en su diario.'
      }
    >
      {isOwnProfile ? (
        <Button asChild>
          <Link to="/search">Buscar partido</Link>
        </Button>
      ) : null}
    </EmptyState>
  );
}
