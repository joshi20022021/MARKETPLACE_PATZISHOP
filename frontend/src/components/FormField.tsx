import { useId, type InputHTMLAttributes } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  registration: UseFormRegisterReturn;
  error?: string;
  hint?: string;
};
export function FormField({ label, registration, error, hint, ...input }: Props) {
  const id = useId();
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        {...input}
        {...registration}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${id}-help` : undefined}
      />
      {(error || hint) && (
        <small id={`${id}-help`} className={error ? 'field-error' : ''}>
          {error || hint}
        </small>
      )}
    </div>
  );
}
