'use client';

import {
  ASSIGNMENT_INSTRUCTIONS_MAX,
  ASSIGNMENT_TITLE_MAX,
  type AssignmentView,
  RUBRIC_TOTAL,
} from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SelectField } from '@/components/forms/SelectField';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { TextField } from '@/components/forms/TextField';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { PlusIcon } from '@/components/ui/icons';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { useErrorMessage } from '@/lib/api/use-error-message';
import { RubricFields, rubricTotal, toRubricRows } from './RubricFields';

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

/** The lesson's exercise: instructions, due week and the rubric students are graded on. */
export function ExerciseSection({
  lessonId,
  assignment,
  weeks,
}: {
  lessonId: string;
  assignment: AssignmentView | null;
  weeks: number;
}) {
  const t = useTranslations('TeachContent.exercise');
  const headingId = useId();
  const [open, setOpen] = useState(assignment !== null);

  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-col gap-4 border-t border-border pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={headingId} className="font-semibold text-ink">
          {t('title')}
        </h2>
        {!open && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setOpen(true);
            }}
          >
            <PlusIcon className="size-4" aria-hidden="true" />
            {t('add')}
          </Button>
        )}
      </div>
      {open ? (
        <ExerciseForm
          lessonId={lessonId}
          assignment={assignment}
          weeks={weeks}
          onDeleted={() => {
            setOpen(false);
          }}
        />
      ) : (
        <p className="text-sm text-ink-muted">{t('none')}</p>
      )}
    </section>
  );
}

function ExerciseForm({
  lessonId,
  assignment,
  weeks,
  onDeleted,
}: {
  lessonId: string;
  assignment: AssignmentView | null;
  weeks: number;
  onDeleted: () => void;
}) {
  const t = useTranslations('TeachContent.exercise');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [saved, setSaved] = useState(assignment);
  const [rows, setRows] = useState(() => toRubricRows(assignment));
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (form: FormData) => {
    setBusy(true);
    setStatus(null);
    try {
      const result = await apiRequest<AssignmentView>(
        'PUT',
        `/api/teach/lessons/${lessonId}/assignment`,
        {
          title: text(form, 'title'),
          instructions: text(form, 'instructions'),
          dueWeek: Number(text(form, 'dueWeek')),
          rubric: rows.map(({ id, title, maxPoints }) => ({ id, title, maxPoints })),
        },
      );
      setSaved(result);
      setRows(toRubricRows(result));
      setStatus({ tone: 'success', text: t('saved') });
      router.refresh();
    } catch (caught) {
      setStatus({ tone: 'error', text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save(new FormData(event.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      {status && <FormAlert tone={status.tone}>{status.text}</FormAlert>}
      <TextField
        name="title"
        label={t('name')}
        defaultValue={saved?.title ?? ''}
        maxLength={ASSIGNMENT_TITLE_MAX}
        required
      />
      <TextAreaField
        name="instructions"
        label={t('instructions')}
        defaultValue={saved?.instructions ?? ''}
        rows={4}
        maxLength={ASSIGNMENT_INSTRUCTIONS_MAX}
      />
      <SelectField
        name="dueWeek"
        label={t('dueWeek')}
        hint={t('dueWeekHint')}
        defaultValue={String(saved?.dueWeek ?? 1)}
        options={Array.from({ length: weeks }, (_, index) => ({
          value: String(index + 1),
          label: t('weekValue', { week: index + 1 }),
        }))}
      />
      <RubricFields rows={rows} setRows={setRows} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        {saved?.submissionCount === 0 ? (
          <ConfirmDialog
            trigger={t('delete')}
            triggerVariant="ghost"
            title={t('deleteTitle')}
            body={t('deleteBody')}
            cancelLabel={t('keep')}
            confirmLabel={t('confirmDelete')}
            onConfirm={async () => {
              await apiRequest('DELETE', `/api/teach/lessons/${lessonId}/assignment`);
              onDeleted();
              router.refresh();
            }}
          />
        ) : (
          <p className="text-xs text-ink-muted">
            {saved ? t('handedIn', { count: saved.submissionCount }) : ''}
          </p>
        )}
        <Button
          type="submit"
          variant="secondary"
          disabled={busy || rubricTotal(rows) !== RUBRIC_TOTAL}
        >
          {t('save')}
        </Button>
      </div>
    </form>
  );
}
