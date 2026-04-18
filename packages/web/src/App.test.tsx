import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

function mockFetchOnce(json: unknown) {
  (globalThis.fetch as unknown) = vi.fn(() =>
    Promise.resolve({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(json)),
    } as Response),
  );
}

describe('App routing', () => {
  it('renders the top navigation', async () => {
    mockFetchOnce({ nodes: [], edges: [], reviews: [] });
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );
    expect(await screen.findByRole('heading', { name: /traceability map/i })).toBeInTheDocument();
    // Nav always shows an "Import JSON" link plus an empty-state one.
    expect(screen.getAllByRole('link', { name: /import json/i }).length).toBeGreaterThan(0);
  });

  it('renders the import wizard step 1', () => {
    render(
      <MemoryRouter initialEntries={['/import']}>
        <App />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: /step 1 — select a json file/i }),
    ).toBeInTheDocument();
  });
});
