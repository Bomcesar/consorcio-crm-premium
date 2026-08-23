export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  fallback: unknown,
): Promise<T> {
  const timeout = new Promise<T>((resolve) => {
    setTimeout(() => resolve(fallback as T), ms);
  });

  return Promise.race([Promise.resolve(promise as Promise<T>), timeout]);
}
