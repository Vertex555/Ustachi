import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';

const queryClient = new QueryClient();

function renderApp() {
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  localStorage.clear();
});

test('language picker opens on app start, then shows onboarding', async () => {
  expect(screen.queryByText('English', { exact: false })).not.toBeInTheDocument();
  renderApp();
  fireEvent.click(screen.getByText('English'));
  expect(await screen.findByText('Ustachi')).toBeInTheDocument();
});