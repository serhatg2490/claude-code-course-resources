// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ShareLink } from '@/components/share-link';

function stubClipboard(writeText: (text: string) => Promise<void>) {
  vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText: vi.fn(writeText) } });
  return navigator.clipboard.writeText;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ShareLink', () => {
  it('links to the public note page', () => {
    render(<ShareLink slug='abc123' />);
    const link = screen.getByRole('link', { name: '/p/abc123' });
    expect(link.getAttribute('href')).toBe('/p/abc123');
    expect(link.getAttribute('target')).toBe('_blank');
  });

  it('copies the absolute URL and confirms', async () => {
    const writeText = stubClipboard(async () => {});
    render(<ShareLink slug='abc123' />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(await screen.findByText('Copied!')).toBeTruthy();
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/p/abc123`);
  });

  it('reports a failed copy', async () => {
    stubClipboard(async () => {
      throw new Error('denied');
    });
    render(<ShareLink slug='abc123' />);

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    expect(await screen.findByText('Could not copy.')).toBeTruthy();
  });
});
