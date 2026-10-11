import { useState } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { FormField } from './FormField';
export function PasswordField({
  label = 'Contraseña',
  registration,
  error,
  creating = false,
}: {
  label?: string;
  registration: UseFormRegisterReturn;
  error?: string;
  creating?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="password-field">
      <FormField
        label={label}
        registration={registration}
        error={error}
        type={visible ? 'text' : 'password'}
        autoComplete={creating ? 'new-password' : 'current-password'}
      />
      <button
        className="text-button password-toggle"
        type="button"
        aria-pressed={visible}
        onClick={() => setVisible(!visible)}
      >
        {visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      </button>
    </div>
  );
}
