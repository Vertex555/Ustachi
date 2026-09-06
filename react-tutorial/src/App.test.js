import { render, screen } from '@testing-library/react';
import App from './App';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';

test('renders onboarding screen with Ustachi brand', () => {
  render(
    <ThemeProvider>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ThemeProvider>
  );
  expect(screen.getByText('Ustachi')).toBeInTheDocument();
});