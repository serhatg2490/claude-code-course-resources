'use client';

import Link from 'next/link';
import { useState } from 'react';

import { toPublicPath } from '@/lib/note-schemas';

type ShareLinkProps = {
  slug: string;
};

type CopyStatus = 'idle' | 'copied' | 'failed';

export function ShareLink({ slug }: ShareLinkProps): React.JSX.Element {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const path = toPublicPath(slug);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
      setStatus('copied');
    } catch {
      setStatus('failed');
    }
  }

  return (
    <div className='flex flex-wrap items-center gap-2 text-sm'>
      <Link
        href={path}
        target='_blank'
        className='min-w-0 truncate rounded-sm font-mono text-link underline underline-offset-4 hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link'
      >
        {path}
      </Link>
      <button
        type='button'
        onClick={handleCopy}
        className='rounded-md border border-neutral-300 px-2 py-1 text-xs font-medium transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-link dark:border-neutral-700 dark:hover:bg-neutral-900'
      >
        Copy link
      </button>
      <span aria-live='polite' className='text-xs text-neutral-500'>
        {status === 'copied' && 'Copied!'}
        {status === 'failed' && 'Could not copy.'}
      </span>
    </div>
  );
}
