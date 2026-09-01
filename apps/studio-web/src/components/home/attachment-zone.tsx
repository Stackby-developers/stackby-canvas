'use client';

import { useRef, useState } from 'react';
import { Paperclip, FileText, Image, X } from 'lucide-react';
import { cn } from '@stackby/ui';

const ACCEPTED = '.png,.jpg,.jpeg,.gif,.webp,.csv,.pdf';
const MAX_FILES = 5;
const MAX_BYTES = 10 * 1024 * 1024;

interface AttachmentZoneProps {
  files: File[];
  onChange: (files: File[]) => void;
}

function fileIcon(file: File) {
  if (file.type.startsWith('image/')) return <Image className="h-3 w-3 text-text-muted" />;
  return <FileText className="h-3 w-3 text-text-muted" />;
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n}B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)}KB`;
  return `${(n / (1024 * 1024)).toFixed(1)}MB`;
}

export function AttachmentZone({ files, onChange }: AttachmentZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function addFiles(incoming: FileList | File[]) {
    const arr = Array.from(incoming);
    const valid = arr.filter((f) => f.size <= MAX_BYTES);
    const merged = [...files, ...valid].slice(0, MAX_FILES);
    onChange(merged);
  }

  function remove(idx: number) {
    onChange(files.filter((_, i) => i !== idx));
  }

  if (files.length === 0 && !dragging) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1.5 text-xs text-text-faint hover:text-text-muted transition-colors"
        >
          <Paperclip className="h-3.5 w-3.5" />
          Attach files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="sr-only"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
        />
      </div>
    );
  }

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
      className={cn(
        'rounded-md border border-dashed p-2 transition-colors',
        dragging ? 'border-accent/60 bg-accent/5' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        {files.map((file, idx) => (
          <div
            key={idx}
            className="flex items-center gap-1.5 rounded border border-border bg-bg-muted px-2 py-1"
          >
            {fileIcon(file)}
            <span className="max-w-[140px] truncate text-[11px] text-text-muted">{file.name}</span>
            <span className="text-[10px] text-text-faint">{formatBytes(file.size)}</span>
            <button
              type="button"
              onClick={() => remove(idx)}
              className="ml-0.5 rounded text-text-faint hover:text-text transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
              aria-label={`Remove ${file.name}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {files.length < MAX_FILES && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1 text-[11px] text-text-faint hover:text-text-muted transition-colors"
          >
            <Paperclip className="h-3 w-3" />
            Add more
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        multiple
        className="sr-only"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); }}
      />
    </div>
  );
}
