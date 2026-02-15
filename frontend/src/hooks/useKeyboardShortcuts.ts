import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { message } from 'antd';

interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
  category?: string;
}

interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
}

export function useKeyboardShortcuts(shortcuts: Shortcut[], options: UseKeyboardShortcutsOptions = {}) {
  const { enabled = true } = options;
  const shortcutsRef = useRef(shortcuts);
  
  shortcutsRef.current = shortcuts;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      if (!event.ctrlKey && !event.metaKey) return;
    }

    for (const shortcut of shortcutsRef.current) {
      const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.alt ? event.altKey : !event.altKey;
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

      if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
        event.preventDefault();
        shortcut.action();
        return;
      }
    }
  }, [enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function useAdminShortcuts() {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    {
      key: 'k',
      ctrl: true,
      description: 'Schnellsuche öffnen',
      action: () => {
        window.dispatchEvent(new CustomEvent('openQuickSearch'));
      },
      category: 'Navigation',
    },
    {
      key: 'g',
      ctrl: true,
      shift: true,
      description: 'Zum Dashboard',
      action: () => navigate('/admin/dashboard'),
      category: 'Navigation',
    },
    {
      key: 'p',
      ctrl: true,
      shift: true,
      description: 'Neuer Post',
      action: () => navigate('/admin/posts/new'),
      category: 'Content',
    },
    {
      key: 'm',
      ctrl: true,
      shift: true,
      description: 'Medien öffnen',
      action: () => navigate('/admin/media'),
      category: 'Content',
    },
    {
      key: 'c',
      ctrl: true,
      shift: true,
      description: 'Kategorien öffnen',
      action: () => navigate('/admin/categories'),
      category: 'Content',
    },
    {
      key: 'u',
      ctrl: true,
      shift: true,
      description: 'Benutzer öffnen',
      action: () => navigate('/admin/users'),
      category: 'Admin',
    },
    {
      key: 's',
      ctrl: true,
      shift: true,
      description: 'Einstellungen öffnen',
      action: () => navigate('/admin/settings'),
      category: 'Admin',
    },
    {
      key: 'h',
      ctrl: true,
      shift: true,
      description: 'System Health öffnen',
      action: () => navigate('/admin/system-health'),
      category: 'Admin',
    },
    {
      key: '/',
      ctrl: true,
      description: 'Shortcuts anzeigen',
      action: () => {
        window.dispatchEvent(new CustomEvent('showShortcuts'));
      },
      category: 'Hilfe',
    },
    {
      key: 's',
      ctrl: true,
      description: 'Speichern',
      action: () => {
        window.dispatchEvent(new CustomEvent('saveCurrentForm'));
        message.info('Speichern...');
      },
      category: 'Aktionen',
    },
    {
      key: 'b',
      ctrl: true,
      shift: true,
      description: 'Neues Backup',
      action: () => navigate('/admin/backups'),
      category: 'System',
    },
    {
      key: 'l',
      ctrl: true,
      shift: true,
      description: 'Activity Logs',
      action: () => navigate('/admin/activity-logs'),
      category: 'System',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return shortcuts;
}

export const defaultShortcuts: Shortcut[] = [
  { key: 'k', ctrl: true, description: 'Schnellsuche', action: () => {}, category: 'Navigation' },
  { key: 's', ctrl: true, description: 'Speichern', action: () => {}, category: 'Aktionen' },
  { key: 'g', ctrl: true, shift: true, description: 'Dashboard', action: () => {}, category: 'Navigation' },
  { key: 'p', ctrl: true, shift: true, description: 'Neuer Post', action: () => {}, category: 'Content' },
  { key: '/', ctrl: true, description: 'Shortcuts anzeigen', action: () => {}, category: 'Hilfe' },
];

export default useKeyboardShortcuts;
