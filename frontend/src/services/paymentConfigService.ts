import { api } from './api';

export interface TransferData {
  titular?: string;
  documento?: string;
  banco?: string;
  tipoCuenta?: string;
  numeroCuenta?: string;
  correo?: string;
}

export interface PaymentConfig {
  qrImagePath?: string | null;
  qrImageBase64?: string | null;
  transferencia?: TransferData;
}

export const paymentConfigService = {
  async obtenerConfig(): Promise<PaymentConfig> {
    const response = await api.get('/payment-config');
    return response.data.data;
  }
};

export default paymentConfigService;
