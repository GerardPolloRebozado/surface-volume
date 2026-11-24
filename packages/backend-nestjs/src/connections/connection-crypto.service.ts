import { Injectable } from '@nestjs/common';
import { decryptJson, encryptJson } from './connection-cipher';

@Injectable()
export class ConnectionCryptoService {
  private key(): Buffer {
    const value = process.env.CONNECTION_KEY;
    if (!value) throw new Error('CONNECTION_KEY is not set');

    const key = Buffer.from(value, 'base64');
    if (key.length !== 32) throw new Error('CONNECTION_KEY must be 32 bytes');

    return key;
  }

  encrypt(value: unknown): { credentialsEnc: Buffer; keyVersion: number } {
    return {
      credentialsEnc: encryptJson(this.key(), value),
      keyVersion: Number(process.env.CONNECTION_KEY_VERSION ?? '1'),
    };
  }

  decrypt(blob: Uint8Array): Record<string, unknown> {
    return decryptJson(this.key(), blob);
  }
}
