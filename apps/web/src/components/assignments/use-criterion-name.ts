import type { RubricCriterion } from '@eta/shared';
import { useTranslations } from 'next-intl';

/** A criterion's name; one left unnamed reads "Criterion 2" in the page language. */
export function useCriterionName() {
  const t = useTranslations('Grading');
  return (criterion: RubricCriterion, index: number) =>
    criterion.title || t('criterionNumber', { number: index + 1 });
}
