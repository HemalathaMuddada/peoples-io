import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Open shortcuts dialog with ? or Shift + /
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setOpen(true);
      }
      // Close with Escape
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  const shortcuts = [
    { key: '⌘K or Ctrl+K', description: 'Quick search across admin pages' },
    { key: '⌘1-6 or Ctrl+1-6', description: 'Navigate to stat card pages' },
    { key: '?', description: 'Show this keyboard shortcuts dialog' },
    { key: 'Esc', description: 'Close dialogs and modals' },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 h-10 w-10 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors flex items-center justify-center text-primary z-50 shadow-lg border border-primary/20"
        title="Keyboard Shortcuts (Press ?)"
      >
        <Keyboard className="h-5 w-5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-5 w-5" />
              Keyboard Shortcuts
            </DialogTitle>
            <DialogDescription>
              Use these shortcuts to navigate faster
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 mt-4">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm text-muted-foreground">{shortcut.description}</span>
                <Badge variant="outline" className="ml-2 font-mono text-xs">
                  {shortcut.key}
                </Badge>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground mt-4 text-center">
            Press <kbd className="px-2 py-1 text-xs font-semibold bg-muted rounded">?</kbd> anytime to see this dialog
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
