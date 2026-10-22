'use client';

import { type DragEvent, useId, useState } from 'react';
import { PlayIcon } from '@/components/ui/icons';
import { cn } from '@/lib/cn';

/**
 * Drag files here or choose them. The real control is a file input with a
 * visible label, so keyboard and screen-reader users never need to drag.
 */
export function DropZone({
  accept,
  multiple = false,
  prompt,
  chooseLabel,
  hint,
  onFiles,
}: {
  accept: string;
  multiple?: boolean;
  prompt: string;
  chooseLabel: string;
  hint: string;
  onFiles: (files: File[]) => void;
}) {
  const inputId = useId();
  const hintId = useId();
  const promptId = useId();
  const [over, setOver] = useState(false);

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setOver(false);
    const files = [...event.dataTransfer.files];
    if (files.length > 0) onFiles(multiple ? files : files.slice(0, 1));
  };

  return (
    // Dragging is a mouse shortcut; the labelled file input below is the accessible control.
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- no native drop target exists
    <div
      role="group"
      aria-labelledby={promptId}
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => {
        setOver(false);
      }}
      onDrop={drop}
      className={cn(
        'flex flex-col items-center gap-2 rounded-[var(--radius-card)] border-2 border-dashed px-4 py-6 text-center',
        over ? 'border-crimson-700 bg-crimson-50' : 'border-ink/25 bg-cream',
      )}
    >
      <span
        aria-hidden="true"
        className="flex size-10 items-center justify-center rounded-full bg-crimson-50 text-crimson-700"
      >
        <PlayIcon className="size-5" />
      </span>
      <p id={promptId} className="text-sm font-semibold text-ink">
        {prompt}{' '}
        <input
          id={inputId}
          type="file"
          accept={accept}
          multiple={multiple}
          aria-describedby={hintId}
          onChange={(event) => {
            const files = [...(event.target.files ?? [])];
            event.target.value = '';
            if (files.length > 0) onFiles(files);
          }}
          className="peer sr-only"
        />
        <label
          htmlFor={inputId}
          className="cursor-pointer rounded-sm text-crimson-700 underline peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-crimson-700"
        >
          {chooseLabel}
        </label>
      </p>
      <p id={hintId} className="max-w-md text-xs text-ink-muted">
        {hint}
      </p>
    </div>
  );
}
