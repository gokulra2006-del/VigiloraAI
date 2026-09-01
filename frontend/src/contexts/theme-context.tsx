import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';
type AccentColor = 'zinc' | 'blue' | 'emerald' | 'rose' | 'amber';

interface ThemeProviderState {
  theme: Theme;
  accentColor: AccentColor;
  roundedCorners: boolean;
  setTheme: (theme: Theme) => void;
  setAccentColor: (color: AccentColor) => void;
  setRoundedCorners: (rounded: boolean) => void;
}

const initialState: ThemeProviderState = {
  theme: 'dark', // Default to dark for VIGILORA AI
  accentColor: 'zinc',
  roundedCorners: true,
  setTheme: () => null,
  setAccentColor: () => null,
  setRoundedCorners: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
  defaultAccent = 'zinc',
  defaultRounded = true,
}: {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultAccent?: AccentColor;
  defaultRounded?: boolean;
}) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('sentinel-theme') as Theme) || defaultTheme
  );
  
  const [accentColor, setAccentColor] = useState<AccentColor>(
    () => (localStorage.getItem('sentinel-accent') as AccentColor) || defaultAccent
  );
  
  const [roundedCorners, setRoundedCorners] = useState<boolean>(
    () => {
      const saved = localStorage.getItem('sentinel-rounded');
      return saved !== null ? JSON.parse(saved) : defaultRounded;
    }
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)')
        .matches
        ? 'dark'
        : 'light';

      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
    
    // Setup theme attributes for CSS variable targeting
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accentColor);
    root.setAttribute('data-rounded', roundedCorners ? 'true' : 'false');
    
  }, [theme, accentColor, roundedCorners]);

  const value = {
    theme,
    accentColor,
    roundedCorners,
    setTheme: (theme: Theme) => {
      localStorage.setItem('sentinel-theme', theme);
      setTheme(theme);
    },
    setAccentColor: (color: AccentColor) => {
      localStorage.setItem('sentinel-accent', color);
      setAccentColor(color);
    },
    setRoundedCorners: (rounded: boolean) => {
      localStorage.setItem('sentinel-rounded', JSON.stringify(rounded));
      setRoundedCorners(rounded);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error('useTheme must be used within a ThemeProvider');

  return context;
};
