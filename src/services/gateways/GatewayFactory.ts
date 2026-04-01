import { IGatewayProvider } from './IGatewayProvider';
import { StripeProvider } from './providers/StripeProvider';
import { MercadoPagoProvider } from './providers/MercadoPagoProvider';
import { PagSeguroProvider } from './providers/PagSeguroProvider';
import { CieloProvider } from './providers/CieloProvider';

export class GatewayFactory {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  static getProvider(providerName: string): IGatewayProvider {
    switch (providerName.toLowerCase()) {
      case 'stripe':
      case 'stripe_clinic':
        return new StripeProvider();
      case 'mercadopago':
        return new MercadoPagoProvider();
      case 'pagseguro':
        return new PagSeguroProvider();
      case 'cielo':
        return new CieloProvider();
      default:
        throw new Error(`Gateway/Provider '${providerName}' não suportado ou implementado na Factory.`);
    }
  }
}
