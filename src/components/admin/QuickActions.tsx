import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Plus, Megaphone, FileDown, Search } from 'lucide-react';
import { useState } from 'react';
import { InviteUserDialog } from '@/components/admin/InviteUserDialog';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export function QuickActions() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const quickLinks = [
    { label: 'User Management', path: '/admin/users', keywords: ['users', 'manage', 'profiles'] },
    { label: 'Job Management', path: '/admin/jobs', keywords: ['jobs', 'postings', 'positions'] },
    { label: 'Mentor Management', path: '/admin/mentor-management', keywords: ['mentors', 'mentorship', 'coaches'] },
    { label: 'Analytics', path: '/admin/analytics', keywords: ['stats', 'metrics', 'data'] },
    { label: 'AI Insights', path: '/admin/ai-insights', keywords: ['ai', 'insights', 'conversations'] },
    { label: 'Organizations', path: '/admin/organizations', keywords: ['orgs', 'companies'] },
    { label: 'Resume Management', path: '/admin/resumes', keywords: ['resumes', 'cvs', 'documents'] },
    { label: 'Reports', path: '/admin/reports', keywords: ['reports', 'export', 'data'] },
    { label: 'Settings', path: '/admin/settings', keywords: ['settings', 'config', 'preferences'] },
  ];

  // Listen for Cmd+K / Ctrl+K
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-3 items-center justify-between p-4 bg-card/50 rounded-lg border border-border/50 backdrop-blur-sm">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => navigate('/admin/jobs')}
            className="gap-2"
            size="sm"
          >
            <Plus className="h-4 w-4" />
            Add Job
          </Button>
          <InviteUserDialog variant="outline" size="sm" />
          <Button
            onClick={() => navigate('/admin/announcements')}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <Megaphone className="h-4 w-4" />
            Announce
          </Button>
          <Button
            onClick={() => navigate('/admin/reports')}
            variant="outline"
            className="gap-2"
            size="sm"
          >
            <FileDown className="h-4 w-4" />
            Export
          </Button>
        </div>
        
        <Button
          onClick={() => setOpen(true)}
          variant="outline"
          className="gap-2"
          size="sm"
        >
          <Search className="h-4 w-4" />
          Quick Search
          <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type to search admin pages..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Admin Pages">
            {quickLinks.map((link) => (
              <CommandItem
                key={link.path}
                onSelect={() => {
                  navigate(link.path);
                  setOpen(false);
                }}
              >
                {link.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
