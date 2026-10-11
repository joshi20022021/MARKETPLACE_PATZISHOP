import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { FormField } from '../components/FormField';
import { PasswordField } from '../components/PasswordField';
import { registerSchema } from '../services/contracts';
import { authenticate, useSession } from '../services/session';
import { errorMessage } from '../services/errors';
export function RegisterPage() {
  const session = useSession();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: search.get('tipo') === 'vendedor' ? 'SELLER' : 'CUSTOMER' },
  });
  const role = watch('role');
  if (session.status === 'authenticated') return <Navigate to="/cuenta" replace />;
  return (
    <section className="auth-page wrap">
      <div className="auth-story">
        <p className="eyebrow">HAY UN LUGAR PARA TI</p>
        <h1>
          Somos vecinos.
          <br />
          Seamos comunidad.
        </h1>
        <p>Conecta con el talento local o dale un nuevo espacio a tu negocio.</p>
        <div className="story-mark" aria-hidden="true">
          ✳
        </div>
      </div>
      <div className="form-card">
        <h2>Crea tu cuenta</h2>
        <p>Empieza con lo que te gusta hacer.</p>
        <form
          onSubmit={handleSubmit(async (values) => {
            setError('');
            try {
              await authenticate('register', {
                name: values.name,
                email: values.email,
                password: values.password,
                role: values.role,
              });
              navigate(values.role === 'SELLER' ? '/cuenta/tienda' : '/cuenta', { replace: true });
            } catch (cause) {
              setError(errorMessage(cause));
            }
          })}
          noValidate
        >
          <fieldset className="role-selector">
            <legend>Quiero participar como</legend>
            <label className={role === 'CUSTOMER' ? 'selected' : ''}>
              <input type="radio" value="CUSTOMER" {...register('role')} />
              Cliente
            </label>
            <label className={role === 'SELLER' ? 'selected' : ''}>
              <input type="radio" value="SELLER" {...register('role')} />
              Vendedor
            </label>
          </fieldset>
          <FormField
            label="Nombre completo"
            registration={register('name')}
            error={errors.name?.message}
            autoComplete="name"
            maxLength={120}
          />
          <FormField
            label="Correo electrónico"
            registration={register('email')}
            error={errors.email?.message}
            type="email"
            autoComplete="email"
          />
          <PasswordField
            registration={register('password')}
            error={errors.password?.message}
            creating
          />
          <p className="field-hint">Al menos 12 caracteres; máximo 72 bytes.</p>
          <PasswordField
            label="Confirmar contraseña"
            registration={register('confirmPassword')}
            error={errors.confirmPassword?.message}
            creating
          />
          {error && (
            <p className="form-alert" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-full"
            disabled={isSubmitting || session.status === 'loading'}
          >
            {isSubmitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
        <p className="form-foot">
          ¿Ya tienes cuenta? <Link to="/ingresar">Ingresa aquí</Link>
        </p>
      </div>
    </section>
  );
}
