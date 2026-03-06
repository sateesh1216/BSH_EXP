import { useEffect } from 'react';

interface KeyboardNavigationConfig {
  [key: string]: string; // key (e.g., '1', '2') -> section id
}

export const useKeyboardNavigation = (
  onNavigate: (section: string) => void,
  config?: KeyboardNavigationConfig
) => {
  const defaultConfig: KeyboardNavigationConfig = config || {
    '1': 'income',
    '2': 'expenses',
    '3': 'savings',
    '4': 'handloan',
    '5': 'reports',
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only trigger when Alt key is pressed
      if (!e.altKey) return;

      // Check if pressed key matches our config
      const section = defaultConfig[e.key];
      if (section) {
        e.preventDefault();
        onNavigate(section);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigate, defaultConfig]);
};
