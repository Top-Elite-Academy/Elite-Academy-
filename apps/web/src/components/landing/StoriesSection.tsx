import type { StoryItem } from '@eta/shared';
import { useTranslations } from 'next-intl';
import { Container } from '@/components/ui/Container';
import { QuoteIcon } from '@/components/ui/icons';
import { SectionHeading } from '@/components/ui/SectionHeading';

/** "Maya Rizk" → "MR" */
function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

/**
 * Spec §3.1.5 (#stories). The API returns only stories with recorded consent
 * (plus illustrative examples in development). Nothing to show → no section.
 */
export function StoriesSection({ stories }: { stories: StoryItem[] }) {
  const t = useTranslations('Landing.stories');
  if (stories.length === 0) return null;

  return (
    <section id="stories" aria-labelledby="stories-title" className="bg-white py-20">
      <Container>
        <SectionHeading id="stories-title" title={t('title')} description={t('description')} />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <li key={story.key} className="flex">
              <figure className="flex w-full flex-col rounded-[var(--radius-card)] border border-border bg-white p-6 shadow-sm">
                <QuoteIcon className="size-7 text-crimson-700" />
                <blockquote className="mt-3 flex-1 leading-relaxed text-ink">
                  {story.quote}
                </blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex size-11 items-center justify-center rounded-full bg-crimson-50 text-sm font-semibold text-crimson-700"
                  >
                    {initialsOf(story.personName)}
                  </span>
                  <span className="text-sm">
                    <span className="block font-semibold text-ink">{story.personName}</span>
                    <span className="block text-ink-muted">{story.programLabel}</span>
                    {story.outcome && (
                      <span className="block font-medium text-crimson-700">{story.outcome}</span>
                    )}
                  </span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
