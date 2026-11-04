'use client';

import {
  ASSIGNMENT_INSTRUCTIONS_MAX,
  ASSIGNMENT_TITLE_MAX,
  type AssignmentView,
  type LessonFileView,
  RUBRIC_TOTAL,
  saveAssignmentSchema,
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
import { ApiError } from '@/lib/api/api-error';
import { apiRequest } from '@/lib/api/client';
import { useErrorMessage } from '@/lib/api/use-error-message';
import { FilesSection } from './FilesSection';
import {
  criterionFieldName,
  type RubricRow,
  RubricFields,
  rubricTotal,
  toRubricRows,
} from './RubricFields';

const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === 'string' ? value : '';
};

/**
 * Error codes by field: "title", "instructions", or a rubric row's key.
 * Paths come from Zod in the browser (["rubric", 0, "title"]) or from the
 * API ("rubric.0.title"); the first code of each field wins.
 */
function errorsByField(paths: [PropertyKey[], string][], rows: RubricRow[]) {
  const errors: Record<string, string> = {};
  for (const [path, code] of paths) {
    const [field, index] = path;
    const key =
      field === 'rubric' && index !== undefined ? rows[Number(index)]?.key : String(field);
    if (key && !(key in errors)) errors[key] = code;
  }
  return errors;
}

/** The lesson's exercise: instructions, files, due week and the rubric students are graded on. */
export function ExerciseSection({
  lessonId,
  assignment,
  weeks,
  files,
}: {
  lessonId: string;
  assignment: AssignmentView | null;
  weeks: number;
  /** The lesson's files marked as part of the exercise. */
  files: LessonFileView[];
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
        <>
          <ExerciseForm
            lessonId={lessonId}
            assignment={assignment}
            weeks={weeks}
            onDeleted={() => {
              setOpen(false);
            }}
          />
          {/* Uploads save at once (outside the form): no need to press "Save exercise". */}
          <FilesSection lessonId={lessonId} kind="exercise" files={files} />
        </>
      ) : (
        <>
          <p className="text-sm text-ink-muted">{t('none')}</p>
          {files.length > 0 && <FilesSection lessonId={lessonId} kind="exercise" files={files} />}
        </>
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
  const tErrors = useTranslations('errors');
  const errorMessage = useErrorMessage();
  const router = useRouter();
  const [saved, setSaved] = useState(assignment);
  const [rows, setRows] = useState(() => toRubricRows(assignment));
  /** Translated message per field ("title", "instructions" or a rubric row key). */
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /** Shows each message under its field and moves focus to the first one. */
  const showFieldErrors = (formElement: HTMLFormElement, codes: Record<string, string>) => {
    const translated = Object.fromEntries(
      Object.entries(codes).map(([field, code]) => [
        field,
        tErrors.has(code) ? tErrors(code as 'generic') : tErrors('generic'),
      ]),
    );
    setFieldErrors(translated);
    setStatus({ tone: 'error', text: tErrors('validation') });
    const firstRow = rows.findIndex((row) => row.key in translated);
    const name =
      'title' in translated ? 'title' : firstRow >= 0 ? criterionFieldName(firstRow) : null;
    const target = name ? formElement.elements.namedItem(name) : null;
    if (target instanceof HTMLElement) target.focus();
  };
  const [status, setStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (formElement: HTMLFormElement) => {
    const form = new FormData(formElement);
    setStatus(null);
    setFieldErrors({});
    const input = {
      title: text(form, 'title'),
      instructions: text(form, 'instructions'),
      dueWeek: Number(text(form, 'dueWeek')),
      rubric: rows.map(({ id, title, maxPoints }) => ({ id, title, maxPoints })),
    };
    // Same rules as the server, checked first so each problem shows at its field.
    const parsed = saveAssignmentSchema.safeParse(input);
    if (!parsed.success) {
      showFieldErrors(
        formElement,
        errorsByField(
          parsed.error.issues.map((issue) => [issue.path, issue.message]),
          rows,
        ),
      );
      return;
    }
    setBusy(true);
    try {
      const result = await apiRequest<AssignmentView>(
        'PUT',
        `/api/teach/lessons/${lessonId}/assignment`,
        input,
      );
      setSaved(result);
      setRows(toRubricRows(result));
      setStatus({ tone: 'success', text: t('saved') });
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && Object.keys(caught.fieldErrors).length > 0) {
        showFieldErrors(
          formElement,
          errorsByField(
            Object.entries(caught.fieldErrors).map(([path, codes]) => [
              path.split('.'),
              codes[0] ?? 'generic',
            ]),
            rows,
          ),
        );
      } else {
        setStatus({ tone: 'error', text: errorMessage(caught) });
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void save(event.currentTarget);
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
        error={fieldErrors['title']}
      />
      <TextAreaField
        name="instructions"
        label={t('instructions')}
        defaultValue={saved?.instructions ?? ''}
        rows={4}
        maxLength={ASSIGNMENT_INSTRUCTIONS_MAX}
        error={fieldErrors['instructions']}
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
      <RubricFields rows={rows} setRows={setRows} errors={fieldErrors} />
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
