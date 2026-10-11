import axios from 'axios';
export function statusOf(error: unknown): number | undefined {
  return axios.isAxiosError(error) ? error.response?.status : undefined;
}
export function errorMessage(error: unknown): string {
  const status = statusOf(error);
  if (status === 429) {
    const delay: unknown = axios.isAxiosError(error)
      ? error.response?.headers['retry-after']
      : undefined;
    const seconds = Number(delay);
    return Number.isFinite(seconds) && seconds > 0
      ? `Demasiados intentos. Espera ${Math.ceil(seconds)} segundos antes de volver a intentar.`
      : 'Demasiados intentos. Espera un momento antes de volver a intentar.';
  }
  if (status === 401) return 'El correo o la contraseña no son válidos, o la sesión ha vencido.';
  if (status === 403) return 'No tienes permiso para realizar esta acción.';
  if (status === 409) return 'Este correo o identificador ya está registrado. Revisa los datos.';
  if (status === 400 || status === 422) return 'Revisa los datos del formulario.';
  if (error instanceof Error && error.message === 'UNSUPPORTED_BROWSER')
    return 'Actualiza tu navegador para iniciar una sesión segura.';
  return 'No pudimos conectar con el servicio. Intenta de nuevo.';
}
