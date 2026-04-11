import { WasenderProvider } from './wasender.provider';
import { UltraMsgProvider } from './ultramsg.provider';
import type { IProvider } from './provider.interface';

// Singletons — instanciados uma vez por processo
const providers: Record<string, IProvider> = {
  wasender: new WasenderProvider(),
  ultramsg: new UltraMsgProvider(),
};

export function getProvider(name: string): IProvider {
  const provider = providers[name];
  if (!provider) throw new Error(`Unknown provider: "${name}". Supported: wasender, ultramsg`);
  return provider;
}
