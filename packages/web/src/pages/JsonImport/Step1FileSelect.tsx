import { useRef, useState } from 'react';

export interface Step1Props {
  onLoaded: (filename: string, parsed: unknown) => void;
}

const Step1FileSelect = ({ onLoaded }: Step1Props) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    setError(null);
    try {
      const text = await file.text();
      const parsed: unknown = JSON.parse(text);
      onLoaded(file.name, parsed);
    } catch (e) {
      setError(`Could not parse JSON: ${(e as Error).message}`);
    }
  };

  return (
    <div className="wizard-step">
      <h2>Step 1 — Select a JSON file</h2>
      <div
        className={`dropzone ${dragOver ? 'active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const f = e.dataTransfer.files[0];
          if (f) void handleFile(f);
        }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <p>Drag & drop a CLI JSON file here, or click to choose one.</p>
        <p className="muted">
          Supports <code>extract_result</code>, <code>link_result</code>, <code>impact_result</code>
          , and <code>bundle</code> shapes from <code>output/</code>.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>
      {error && <p className="error">{error}</p>}
    </div>
  );
};

export default Step1FileSelect;
