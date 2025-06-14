export function assert(value: unknown, message?: string): asserts value {
  if (!value) {
    throw new Error(message);
  }
}

export function tryGet<T>(message: string, value: T): NonNullable<T> {
  if (!value) {
    throw new Error(message);
  }

  return value;
}
