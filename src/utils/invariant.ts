export function invariant(value: unknown, message?: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

export function tryGet<T extends unknown>(message: string, value: T): NonNullable<T> {
  if (!value) {
    throw new Error(message);
  }

  return value;
}
