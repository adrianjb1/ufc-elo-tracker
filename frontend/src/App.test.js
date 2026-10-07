import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ ok: true, headers: { get: () => '0' }, json: () => Promise.resolve([]) })
  );
});

test('renders heading, view tabs, and empty state', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/current\s*elo rankings/i);
  expect(screen.getByRole('tab', { name: /trending/i })).toBeInTheDocument();
  expect(await screen.findByText(/No fighters match/i)).toBeInTheDocument();
});
