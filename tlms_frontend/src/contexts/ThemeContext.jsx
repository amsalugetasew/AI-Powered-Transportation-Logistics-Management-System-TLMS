import { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: {
    id: 'light',
    name: 'Light Mode',
    // Using your original purple color (#8E288D)
    primaryColor: '#8E288D',
    bgColor: '#F8F8FF',
    cardBg: 'bg-white',
    textPrimary: 'text-gray-900',
    textSecondary: 'text-gray-600',
    border: 'border-gray-200',
    hover: 'hover:bg-gray-50',
    navbar: 'bg-gradient-to-b from-[#F8F8FF] to-[#F8F8FF]',
    navbarText: 'text-[#8E288D]',
    navbarHover: 'hover:text-white hover:bg-[#8E288D]',
    navbarActive: 'text-white bg-[#8E288D] shadow-sm',
    sidebar: 'bg-white',
    sidebarActive: 'bg-[#8E288D] text-white shadow-sm',
    sidebarInactive: 'text-gray-700 hover:bg-gray-100',
    bodyBg: 'bg-gray-50',
    success: 'green',
    warning: 'amber',
    danger: 'red',
    info: 'cyan',
  },
  dark: {
    id: 'dark',
    name: 'Dark Mode',
    primaryColor: '#8B5CF6', // Violet for dark mode
    bgColor: '#0F172A',
    cardBg: 'bg-slate-800',
    textPrimary: 'text-white',
    textSecondary: 'text-slate-400',
    border: 'border-slate-700',
    hover: 'hover:bg-slate-700',
    navbar: 'bg-gradient-to-r from-slate-900 to-slate-800',
    navbarText: 'text-white',
    navbarHover: 'hover:bg-white/10',
    navbarActive: 'text-white bg-white/20 shadow-sm',
    sidebar: 'bg-slate-900',
    sidebarActive: 'bg-violet-600 text-white shadow-sm',
    sidebarInactive: 'text-slate-300 hover:bg-slate-800',
    bodyBg: 'bg-slate-950',
    success: 'emerald',
    warning: 'amber',
    danger: 'rose',
    info: 'violet',
  },
};

export function ThemeProvider({ children }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('dark_mode');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('dark_mode', isDarkMode);
  }, [isDarkMode]);

  const theme = isDarkMode ? themes.dark : themes.light;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
