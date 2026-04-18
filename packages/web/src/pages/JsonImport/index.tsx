import { useMemo, useState } from 'react';
import { apiPost } from '../../api/client';
import type { ImportSummary } from '../../api/types';
import Step1FileSelect from './Step1FileSelect';
import Step2Validate from './Step2Validate';
import Step3DiffPreview from './Step3DiffPreview';
import Step4Ingest from './Step4Ingest';
import { validatePayload, type ValidationResult } from './validation';

interface WizardState {
  step: 1 | 2 | 3 | 4;
  filename: string | null;
  parsed: unknown;
  summary: ImportSummary | null;
  submitError: string | null;
  submitting: boolean;
}

const initialState: WizardState = {
  step: 1,
  filename: null,
  parsed: null,
  summary: null,
  submitError: null,
  submitting: false,
};

const JsonImport = () => {
  const [state, setState] = useState<WizardState>(initialState);
  const validation: ValidationResult | null = useMemo(
    () => (state.parsed !== null ? validatePayload(state.parsed) : null),
    [state.parsed],
  );

  const reset = () => setState(initialState);

  const submit = async (payload: unknown) => {
    setState((s) => ({ ...s, submitting: true, submitError: null }));
    try {
      const summary = await apiPost<ImportSummary>('/api/import', payload);
      setState((s) => ({ ...s, summary, submitting: false, step: 4 }));
    } catch (e) {
      setState((s) => ({ ...s, submitting: false, submitError: (e as Error).message }));
    }
  };

  return (
    <div className="wizard-layout">
      <header>
        <h1>Import CLI JSON</h1>
        <ol className="wizard-steps">
          {(['Select', 'Validate', 'Preview', 'Ingest'] as const).map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3 | 4;
            return (
              <li
                key={label}
                className={state.step === n ? 'active' : state.step > n ? 'done' : 'upcoming'}
              >
                {n}. {label}
              </li>
            );
          })}
        </ol>
      </header>

      {state.submitError && <p className="error">{state.submitError}</p>}

      {state.step === 1 && (
        <Step1FileSelect
          onLoaded={(filename, parsed) => setState((s) => ({ ...s, filename, parsed, step: 2 }))}
        />
      )}

      {state.step === 2 && state.parsed !== null && state.filename && validation && (
        <Step2Validate
          filename={state.filename}
          parsed={state.parsed}
          validation={validation}
          onBack={() => setState((s) => ({ ...s, step: 1 }))}
          onNext={() => setState((s) => ({ ...s, step: 3 }))}
        />
      )}

      {state.step === 3 && state.parsed !== null && (
        <Step3DiffPreview
          parsed={state.parsed}
          submitting={state.submitting}
          onBack={() => setState((s) => ({ ...s, step: 2 }))}
          onSubmit={(edited) => void submit(edited)}
        />
      )}

      {state.step === 4 && state.summary && <Step4Ingest summary={state.summary} onReset={reset} />}
    </div>
  );
};

export default JsonImport;
