import { useRef } from 'react';
import { useI18n } from '../../lib/i18n';

interface OwnerToolbarProps {
  dirty: boolean;
  onExport: () => void;
  onImport: (file: File) => void;
  onPublish: () => void;
}

export function OwnerToolbar({ dirty, onExport, onImport, onPublish }: OwnerToolbarProps) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="owner-toolbar">
      <button type="button" className="btn btn-ghost" onClick={onExport}>
        {t['map.export']}
      </button>

      <button type="button" className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
        {t['map.import']}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="visually-hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onImport(file);
          event.target.value = '';
        }}
      />

      <button type="button" className="btn btn-primary" onClick={onPublish}>
        {t['map.publish']}
      </button>

      <p className={`owner-toolbar__status${dirty ? ' owner-toolbar__status--dirty' : ''}`}>
        {dirty ? t['map.localAhead'] : t['map.inSync']}
      </p>
    </div>
  );
}
