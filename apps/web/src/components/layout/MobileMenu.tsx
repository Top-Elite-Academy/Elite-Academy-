'use client';

import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';
import { CloseIcon, MenuIcon } from '@/components/ui/icons';
import { MOBILE_NAV, ROUTES } from '@/config/navigation';
import { Link } from '@/i18n/navigation';

/**
 * Full-screen mobile menu (board "Mobile · Menu open"). Built on the native
 * <dialog>: focus is trapped inside, Escape closes it, and focus returns to
 * the menu button — accessible without extra JavaScript.
 */
export function MobileMenu() {
  const t = useTranslations();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={() => dialogRef.current?.showModal()}
        className="inline-flex size-11 items-center justify-center rounded-[var(--radius-control)] text-navy-900 hover:bg-navy-50 lg:hidden"
      >
        <MenuIcon className="size-6" />
        <span className="sr-only">{t('Nav.openMenu')}</span>
      </button>

      <dialog
        ref={dialogRef}
        aria-label={t('Nav.mobileMenu')}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-white p-0 backdrop:bg-navy-900/40"
      >
        <div className="flex h-full flex-col px-4 py-3">
          <div className="flex items-center justify-between">
            <Logo />
            <button
              type="button"
              onClick={close}
              className="inline-flex size-11 items-center justify-center rounded-[var(--radius-control)] text-navy-900 hover:bg-navy-50"
            >
              <CloseIcon className="size-6" />
              <span className="sr-only">{t('Nav.closeMenu')}</span>
            </button>
          </div>

          <nav aria-label={t('Nav.primary')} className="mt-6 flex-1">
            <ul className="flex flex-col">
              {MOBILE_NAV.map((item) => (
                <li key={item.label}>
                  <Link
                    href={item.href}
                    onClick={close}
                    className="block border-b border-border py-4 text-lg font-semibold text-navy-900"
                  >
                    {t(item.label)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <ButtonLink href={ROUTES.courses} onClick={close} size="lg" className="mb-4 w-full">
            {t('Nav.exploreCourses')}
          </ButtonLink>
        </div>
      </dialog>
    </>
  );
}
