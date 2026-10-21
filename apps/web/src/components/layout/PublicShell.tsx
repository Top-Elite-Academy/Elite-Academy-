import type { ReactNode } from 'react';
import { ChatLoader } from '@/components/chat/ChatLoader';
import { Footer } from './Footer';
import { Header } from './Header';
import { MAIN_CONTENT_ID, SkipLink } from './SkipLink';

/** Frame of every public page: skip link, header, main content, footer, chat assistant. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <Header />
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <Footer />
      <ChatLoader />
    </>
  );
}
