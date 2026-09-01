'use client';

import * as React from 'react';
import {
  LayoutDashboard,
  ListChecks,
  CalendarDays,
  TrendingUp,
  Sparkles,
  BarChart3,
  BarChart2,
  AlertTriangle,
  ShoppingCart,
  Folder,
  FolderTree,
  Package,
  Users,
  ShieldCheck,
  KanbanSquare,
  BookOpen,
  UploadCloud,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  PieChart,
  type LucideIcon,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TabDef, TabId } from '@/lib/tabs';

const ICONS: Record<TabId | 'upload', LucideIcon> = {
  upload: UploadCloud,
  overview: LayoutDashboard,
  actions7d: ListChecks,
  weekly: CalendarDays,
  forecast: TrendingUp,
  newitems: Sparkles,
  monthcmp: BarChart3,
  weekcmp: BarChart2,
  deficit: AlertTriangle,
  procurement: ShoppingCart,
  categories: Folder,
  subcategories: FolderTree,
  models: Package,
  clients: Users,
  dataquality: ShieldCheck,
  abc: PieChart,
  tasks: KanbanSquare,
  narrative: BookOpen,
};

const SIDEBAR_COLLAPSED_KEY = 'decision-cockpit:sidebar-collapsed';

function groupTabs(tabs: TabDef[]) {
  const groups: { group: string | null; items: TabDef[] }[] = [];
  for (const tab of tabs) {
    const key = tab.group ?? null;
    const last = groups[groups.length - 1];
    if (last && last.group === key) last.items.push(tab);
    else groups.push({ group: key, items: [tab] });
  }
  return groups;
}

function NavLink({
  id,
  label,
  active,
  collapsed,
  onClick,
}: {
  id: TabId | 'upload';
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  const Icon = ICONS[id];
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
        collapsed && 'justify-center px-0',
        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      )}
    >
      <Icon className="size-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  if (!collapsed) return btn;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{btn}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

function NavContent({
  tabs,
  activeTab,
  collapsed,
  onSelect,
}: {
  tabs: TabDef[];
  activeTab: TabId | 'upload';
  collapsed: boolean;
  onSelect: (id: TabId | 'upload') => void;
}) {
  const groups = groupTabs(tabs);
  return (
    <nav className={cn('flex flex-col gap-1 p-3', collapsed && 'items-center px-2')}>
      <NavLink id="upload" label="Загрузка" active={activeTab === 'upload'} collapsed={collapsed} onClick={() => onSelect('upload')} />
      {groups.map((g, i) => (
        <div key={i} className={cn(g.group && 'mt-2', collapsed && 'w-full')}>
          {g.group && !collapsed && (
            <div className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-muted-foreground/80 uppercase">{g.group}</div>
          )}
          {g.group && collapsed && <div className="mx-2 my-1.5 border-t" />}
          <div className={cn('flex flex-col gap-1', collapsed && 'items-center')}>
            {g.items.map((t) => (
              <NavLink key={t.id} id={t.id} label={t.label} active={activeTab === t.id} collapsed={collapsed} onClick={() => onSelect(t.id)} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

export function AppSidebar({
  tabs,
  activeTab,
  onSelect,
}: {
  tabs: TabDef[];
  activeTab: TabId | 'upload';
  onSelect: (id: TabId | 'upload') => void;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  React.useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === '1');
    } catch {
      // localStorage недоступен — сайдбар просто останется развёрнутым
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0');
      } catch {
        // ignore
      }
      return next;
    });
  }

  function select(id: TabId | 'upload') {
    onSelect(id);
    setMobileOpen(false);
  }

  return (
    <>
      {/* Мобильная кнопка меню */}
      <button
        className="fixed top-3 left-3 z-30 flex size-9 items-center justify-center rounded-md border bg-card shadow-sm md:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Открыть меню"
      >
        <Menu className="size-4" />
      </button>

      {/* Десктоп: постоянный сайдбар, можно свернуть в узкую полосу с иконками */}
      <aside className={cn('hidden shrink-0 flex-col border-r bg-card transition-[width] duration-200 md:flex', collapsed ? 'w-16' : 'w-64')}>
        <div className={cn('flex items-center border-b px-4 py-4', collapsed && 'justify-center px-2')}>
          {!collapsed && <span className="flex-1 truncate text-lg font-bold">Decision Cockpit</span>}
          <button
            onClick={toggleCollapsed}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            title={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
            aria-label={collapsed ? 'Развернуть панель' : 'Свернуть панель'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <NavContent tabs={tabs} activeTab={activeTab} collapsed={collapsed} onSelect={select} />
        </div>
      </aside>

      {/* Мобильный выезжающий сайдбар */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40 animate-in fade-in duration-200" onClick={() => setMobileOpen(false)} />
          <aside className="animate-in slide-in-from-left duration-200 absolute inset-y-0 left-0 flex w-72 flex-col border-r bg-card shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-4">
              <span className="text-lg font-bold">Decision Cockpit</span>
              <button onClick={() => setMobileOpen(false)} aria-label="Закрыть меню" className="rounded-md p-1 hover:bg-accent">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <NavContent tabs={tabs} activeTab={activeTab} collapsed={false} onSelect={select} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
