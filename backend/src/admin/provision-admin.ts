import { hash } from 'bcrypt';
import { isEmail } from 'class-validator';
import { Prisma, type PrismaClient } from '../generated/prisma/client';

/** Operator-only utility. Never called by an HTTP controller or the seed. */
export async function provisionAdmin(
  db: PrismaClient,
  input: { name?: string; email?: string; password?: string },
) {
  const name = input.name?.trim() ?? '';
  const email = input.email?.trim().toLowerCase() ?? '';
  const password = input.password ?? '';
  if (
    name.length < 2 ||
    name.length > 120 ||
    email.length > 254 ||
    !isEmail(email) ||
    Array.from(password).length < 12 ||
    Buffer.byteLength(password, 'utf8') > 72
  )
    throw new Error(
      'Configura nombre (2–120), correo válido y contraseña de 12 caracteres o más, hasta 72 bytes.',
    );
  const passwordHash = await hash(password, 12);
  try {
    return await db.user.create({
      data: { name, email, passwordHash, role: 'ADMIN' },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new Error('El correo ya existe. No se modificó la cuenta existente.', { cause: error });
    throw error;
  }
}
