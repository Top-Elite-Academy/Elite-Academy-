'use client';

import {
  createLessonSchema,
  LESSON_TITLE_MAX,
  type TeachLesson,
  type TeachModule,
} from '@eta/shared';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SelectField } from '@/components/forms/SelectField';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { Button } from '@/components/ui/Button';
import { CloseIcon, PlusIcon } from '@/components/ui/icons';
import { teachContentPath } from '@/config/navigation';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';

/** "Add lesson": a draft at the end of the program, then open it. */
export function AddLessonDialog({
  programId,
  modules,
}: {
  programId: string;
  modules: TeachModule[];
}) {
  const t = useTranslations('TeachContent.add');
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(createLessonSchema);

  const submit = onSubmit(async (data) => {
    const lesson = await apiRequest<TeachLesson>(
      'POST',
      `/api/teach/programs/${programId}/lessons`,
      data,
    );
    router.push(teachContentPath(programId, lesson.id));
    router.refresh();
  });

  return (
    <>
      <Button aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        <PlusIcon className="size-4" />
        {t('button')}
      </Button>
      <dialog
        ref={dialogRef}
        aria-labelledby="add-lesson-title"
        className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-[var(--radius-card)] bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      >
        <form
          noValidate
          onSubmit={(event) => void submit(event)}
          className="flex flex-col gap-5 p-6"
        >
          <div className="flex items-start justify-between gap-4">
            <h2 id="add-lesson-title" className="text-xl font-bold">
              {t('title')}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex size-10 shrink-0 items-center justify-center rounded-full hover:bg-sand"
            >
              <CloseIcon className="size-5" />
              <span className="sr-only">{t('cancel')}</span>
            </button>
          </div>
          {formError && <FormAlert tone="error">{formError}</FormAlert>}
          <TextField
            name="title"
            label={t('lessonTitle')}
            required
            maxLength={LESSON_TITLE_MAX}
            error={fieldErrors['title']}
          />
          {modules.length > 0 && (
            <SelectField
              name="moduleId"
              label={t('module')}
              options={[
                { value: '', label: t('noModule') },
                ...modules.map((module) => ({ value: module.id, label: module.title })),
              ]}
              defaultValue={modules[0]?.id}
              error={fieldErrors['moduleId']}
            />
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => dialogRef.current?.close()}>
              {t('cancel')}
            </Button>
            <div className="min-w-40">
              <SubmitButton submitting={submitting}>{t('create')}</SubmitButton>
            </div>
          </div>
        </form>
      </dialog>
    </>
  );
}
