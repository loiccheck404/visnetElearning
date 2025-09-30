import { Injectable, signal, effect } from '@angular/core';

export type Theme = 'light' | 'dark';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly THEME_KEY = 'visnet_theme';

  // Current theme as a signal
  currentTheme = signal<Theme>(this.getInitialTheme());

  constructor() {
    // Effect to apply theme when it changes
    effect(() => {
      this.applyTheme(this.currentTheme());
    });
  }

  private getInitialTheme(): Theme {
    // Check localStorage first
    const savedTheme = localStorage.getItem(this.THEME_KEY) as Theme;
    if (savedTheme) {
      return savedTheme;
    }

    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }

    return 'light';
  }

  private applyTheme(theme: Theme): void {
    // Remove existing theme classes
    document.documentElement.classList.remove('light-theme', 'dark-theme');

    // Add new theme class
    document.documentElement.classList.add(`${theme}-theme`);

    // Save to localStorage
    localStorage.setItem(this.THEME_KEY, theme);
  }

  toggleTheme(): void {
    this.currentTheme.set(this.currentTheme() === 'light' ? 'dark' : 'light');
  }

  setTheme(theme: Theme): void {
    this.currentTheme.set(theme);
  }

  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }
}
