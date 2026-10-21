import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, useSession } from '../services/session';
import { userSchema } from '../services/contracts';
import { errorMessage } from '../services/errors';
export function AccountPage() {
  const user = useSession((state) => state.user);
  const profile = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async ({ signal }) => userSchema.parse((await api.get('/auth/me', { signal })).data),
  });
  if (profile.isPending)
    return (
      <div className="wrap page-state" role="status">
        Cargando tu cuenta…
      </div>
    );
  if (profile.isError)
    return (
      <div className="wrap page-state">
        <p role="alert">{errorMessage(profile.error)}</p>
        <button className="button" onClick={() => void profile.refetch()}>
          Reintentar
        </button>
      </div>
    );
  const roles = { CUSTOMER: 'Cliente', SELLER: 'Vendedor', ADMIN: 'Administrador' };
  return (
    <section className="wrap account-page">
      <p className="eyebrow">TU ESPACIO EN LA COMUNIDAD</p>
      <h1>Hola, {profile.data.name}.</h1>
      <p className="page-intro">Qué bueno tenerte cerca.</p>
      <div className="account-grid">
        <div className="form-card">
          <h2>Mi cuenta</h2>
          <dl className="profile-details">
            <dt>Nombre</dt>
            <dd>{profile.data.name}</dd>
            <dt>Correo electrónico</dt>
            <dd>{profile.data.email}</dd>
            <dt>Tipo de cuenta</dt>
            <dd>{roles[profile.data.role]}</dd>
          </dl>
        </div>
        <aside className="account-aside">
          <span aria-hidden="true">✳</span>
          <h2>
            {profile.data.role === 'SELLER' ? 'Dale vida a tu tienda' : 'Gracias por ser parte'}
          </h2>
          <p>
            {profile.data.role === 'SELLER'
              ? 'Completa los datos de tu negocio y mantén al día tu información de contacto.'
              : 'Desde aquí puedes consultar los datos de tu cuenta.'}
          </p>
          {profile.data.role === 'SELLER' && (
            <Link className="button" to="/vendedor">
              Abrir mi panel ↗
            </Link>
          )}
        </aside>
      </div>
    </section>
  );
}
