import { Buffer } from 'node:buffer';
import { ValidateBy, ValidationOptions } from 'class-validator';

export function MaxByteLength(max: number, options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'maxByteLength',
      constraints: [max],
      validator: {
        validate: (value: unknown) =>
          typeof value === 'string' && Buffer.byteLength(value, 'utf8') <= max,
        defaultMessage: () => `El valor no puede superar ${max} bytes UTF-8`,
      },
    },
    options,
  );
}
