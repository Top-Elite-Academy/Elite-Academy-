import type { ProgramSummary } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { ProgramCard } from '@/components/catalog/ProgramCard';
import { ButtonLink } from '@/components/ui/Button';
import { Container } from '@/components/ui/Container';
import { SectionHeading } from '@/components/ui/SectionHeading';
import { ROUTES } from '@/config/navigation';

/** Spec §3.1.2 — the three "top programs" chosen in admin. No prices. */
export function TopProgramsSection({ programs }: { programs: ProgramSummary[] }) {
  const t = useTranslations('Landing.topPrograms');
  if (programs.length === 0) return null;

  return (
    <section aria-labelledby="top-programs-title" className="bg-cream py-20">
      <Container>
        <SectionHeading
          id="top-programs-title"
          title={t('title')}
          description={t('description')}
          action={
            <ButtonLink href={ROUTES.courses} variant="secondary">
              {t('viewAll')}
            </ButtonLink>
          }
        />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <li key={program.slug} className="flex">
              <ProgramCard program={program} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
