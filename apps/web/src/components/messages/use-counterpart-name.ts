import type { Counterpart, Recipient } from '@eta/shared';
import { useTranslations } from 'next-intl';

/** "Dania Hih", or "Support team" / "Payments team" in the page language. */
export function useCounterpartName() {
  const t = useTranslations('Messages.teams');
  return (who: Counterpart | Recipient) =>
    who.kind === 'team' ? t(who.team) : `${who.firstName} ${who.lastName}`;
}
