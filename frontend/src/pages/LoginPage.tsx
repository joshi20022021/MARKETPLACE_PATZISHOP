import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { FormField } from '../components/FormField';
import { PasswordField } from '../components/PasswordField';
import { loginSchema } from '../services/contracts';
import { authenticate, useSession } from '../services/session';
import { errorMessage } from '../services/errors';
export function LoginPage() {
  const session = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema) });
  const from: unknown = (location.state as { from?: unknown } | null)?.from;
  const destination =
    typeof from === 'string' &&
    (['/cuenta/tienda', '/carrito', '/checkout'].includes(from) ||
      /^\/productos\/[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(from))
      ? from
      : '/cuenta';
  if (session.status === 'authenticated') return <Navigate to={destination} replace />;
  return (
    <section className="auth-page wrap">
      <div className="auth-story">
        <p className="eyebrow">QUÉ BUENO VERTE DE NUEVO</p>
        <h1>
          Lo cercano
          <br />
          nos conecta.
        </h1>
        <p>Entra a tu cuenta y sigue siendo parte de nuestro comercio local.</p>
        <div className="story-mark" aria-hidden="true">
          ✳
        </div>
      </div>
      <div className="form-card">
        <h2>Ingresa a PatziShop</h2>
        <p>Tu comunidad está aquí.</p>
        <form
          onSubmit={handleSubmit(async (values) => {
            setError('');
            try {
              await authenticate('login', values);
              navigate(destination, { replace: true });
            } catch (cause) {
              setError(errorMessage(cause));
            }
          })}
          noValidate
        >
          <FormField
            label="Correo electrónico"
            registration={register('email')}
            error={errors.email?.message}
            type="email"
            autoComplete="email"
          />
          <PasswordField registration={register('password')} error={errors.password?.message} />
          {error && (
            <p className="form-alert" role="alert">
              {error}
            </p>
          )}
          <button
            className="button button-full"
            disabled={isSubmitting || session.status === 'loading'}
          >
            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
        <p className="form-foot">
          ¿Aún no tienes cuenta? <Link to="/registro">Crea una aquí</Link>
        </p>
      </div>
    </section>
  );
}
