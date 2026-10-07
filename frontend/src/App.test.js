import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
});

test('renders hero and view tabs', async () => {
  render(<App />);
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/UFC Elo\s*Leaderboard/i);
  expect(screen.getByRole('button', { name: /trending/i })).toBeInTheDocument();
  expect(await screen.findByText(/No fighters match/i)).toBeInTheDocument();
});
