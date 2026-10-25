'use client';

import {
  type AssignmentView,
  LESSON_ABOUT_MAX,
  LESSON_TITLE_MAX,
  type TeachLesson,
  type TeachLessonList,
  updateLessonSchema,
} from '@eta/shared';
import { useFormatter, useNow, useTranslations } from 'next-intl';
import { useState } from 'react';
import { FormAlert } from '@/components/forms/FormAlert';
import { SelectField } from '@/components/forms/SelectField';
import { TextAreaField } from '@/components/forms/TextAreaField';
import { TextField } from '@/components/forms/TextField';
import { useApiForm } from '@/components/forms/use-api-form';
import { Button } from '@/components/ui/Button';
import { useRouter } from '@/i18n/navigation';
import { apiRequest } from '@/lib/api/client';
import { ExerciseSection } from './ExerciseSection';
import { FilesSection } from './FilesSection';
import { PublishBar } from './PublishBar';
import { useProcessingRefresh } from './use-processing-refresh';
import { VideoSection } from './VideoSection';

/** Relative times ("2 minutes ago") move on once a minute. */
const NOW_INTERVAL = 60_000;

/** The lesson editor (design "Instructor 6", right column). */
export function LessonEditor({
  lesson,
  list,
  assignment,
}: {
  lesson: TeachLesson;
  list: TeachLessonList;
  assignment: AssignmentView | null;
}) {
  const t = useTranslations('TeachContent.editor');
  const format = useFormatter();
  const now = useNow({ updateInterval: NOW_INTERVAL });
  const router = useRouter();
  const { fieldErrors, formError, submitting, onSubmit } = useApiForm(updateLessonSchema);
  const [saved, setSaved] = useState(false);
  useProcessingRefresh(lesson);

  // The shared schema turns the selects' text values into numbers and nulls.
  const save = onSubmit(async (data) => {
    await apiRequest('PATCH', `/api/teach/lessons/${lesson.id}`, data);
    setSaved(true);
    router.refresh();
  });

  const weekCount = list.program.lengthWeeks ?? 24;
  const weeks = Array.from({ length: weekCount }, (_, index) => index + 1);
  const moduleTitle = list.modules.find((module) => module.id === lesson.moduleId)?.title;

  return (
    <div className="flex flex-col gap-6">
      <p className="font-mono text-xs tracking-wider text-ink-muted uppercase">
        {[t('heading', { number: lesson.position }), moduleTitle].filter(Boolean).join(' · ')}
      </p>

      <form
        noValidate
        onSubmit={(event) => {
          setSaved(false);
          void save(event);
        }}
        className="flex flex-col gap-5"
      >
        {formError && <FormAlert tone="error">{formError}</FormAlert>}
        <TextField
          name="title"
          label={t('lessonTitle')}
          defaultValue={lesson.title}
          maxLength={LESSON_TITLE_MAX}
          required
          error={fieldErrors['title']}
        />
        <TextAreaField
          name="about"
          label={t('about')}
          defaultValue={lesson.about}
          rows={4}
          maxLength={LESSON_ABOUT_MAX}
          error={fieldErrors['about']}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <SelectField
            name="availableFromWeek"
            label={t('week')}
            defaultValue={lesson.availableFromWeek === null ? '' : String(lesson.availableFromWeek)}
            options={[
              { value: '', label: t('weekAny') },
              ...weeks.map((week) => ({ value: String(week), label: t('weekValue', { week }) })),
            ]}
            error={fieldErrors['availableFromWeek']}
          />
          {list.modules.length > 0 && (
            <SelectField
              name="moduleId"
              label={t('module')}
              defaultValue={lesson.moduleId ?? ''}
              options={[
                { value: '', label: '—' },
                ...list.modules.map((module) => ({ value: module.id, label: module.title })),
              ]}
              error={fieldErrors['moduleId']}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="secondary" disabled={submitting}>
            {t('saveDraft')}
          </Button>
          <span role="status" className="text-xs text-ink-muted">
            {saved
              ? t('saved')
              : t('lastSaved', { time: format.relativeTime(new Date(lesson.updatedAt), now) })}
          </span>
        </div>
      </form>

      <VideoSection lessonId={lesson.id} videos={lesson.videos} provider={list.videoProvider} />
      <FilesSection lessonId={lesson.id} files={lesson.files} />
      <ExerciseSection lessonId={lesson.id} assignment={assignment} weeks={weekCount} />
      <PublishBar lesson={lesson} />
    </div>
  );
}
