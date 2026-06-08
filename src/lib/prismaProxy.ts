export function createPrismaProxy<TClient extends object>(
  resolveClient: () => TClient
): TClient {
  return new Proxy({} as TClient, {
    get(_target, prop) {
      const client = resolveClient();
      const value = Reflect.get(client, prop, client);

      if (typeof value === "function") {
        return value.bind(client);
      }

      return value;
    },
  });
}
