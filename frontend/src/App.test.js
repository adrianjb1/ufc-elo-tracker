import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }));
});

test('renders leaderboard heading', () => {
  render(<App />);
  expect(screen.getByText(/UFC Elo Leaderboard/i)).toBeInTheDocument();
});
