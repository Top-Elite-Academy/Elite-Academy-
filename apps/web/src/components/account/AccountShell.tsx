import type { ReactNode } from 'react';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';
import { MAIN_CONTENT_ID, SkipLink } from '@/components/layout/SkipLink';
import { Container } from '@/components/ui/Container';
import { SignOutButton } from './SignOutButtons';

/**
 * Minimal frame for signed-in pages. Replaced by the student sidebar (milestone 4)
 * and the admin/CRM sidebars (milestones 3 and 6).
 */
export function AccountShell({ children }: { children: ReactNode }) {
  return (
    <>
      <SkipLink />
      <header className="border-b border-border bg-white">
        <Container className="flex h-16 items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-2">
            <LanguageSwitcher saveToProfile />
            <SignOutButton scope="current" />
          </div>
        </Container>
      </header>
      <main id={MAIN_CONTENT_ID} tabIndex={-1} className="flex-1 bg-cream focus:outline-none">
        <Container className="py-10">{children}</Container>
      </main>
    </>
  );
}
