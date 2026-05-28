import { Injectable, Logger } from '@nestjs/common';
import { request } from 'https';
import { URLSearchParams } from 'url';
import { EnvService } from '@/config/env/env.service';

export interface WhatsAppSendOptions {
  to: string;
  text: string;
}

@Injectable()
export class WhatsappProvider {
  private readonly logger = new Logger(WhatsappProvider.name);
  private readonly accountSid: string;
  private readonly authToken: string;
  private readonly from: string;

  constructor(private readonly envService: EnvService) {
    this.accountSid = this.envService.twilioAccountSid;
    this.authToken = this.envService.twilioAuthToken;
    this.from = this.envService.whatsappFrom;
  }

  async send(options: WhatsAppSendOptions): Promise<void> {
    if (!this.accountSid || !this.authToken || !this.from) {
      throw new Error(
        'WhatsApp não configurado. Defina WHATSAPP_FROM, TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN.',
      );
    }

    const to = options.to.startsWith('whatsapp:')
      ? options.to
      : `whatsapp:${options.to}`;
    const from = this.from.startsWith('whatsapp:')
      ? this.from
      : `whatsapp:${this.from}`;

    const payload = new URLSearchParams({
      From: from,
      To: to,
      Body: options.text,
    }).toString();

    const url = new URL(
      `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
    );

    await this.post(url, payload);
  }

  private post(url: URL, payload: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString(
        'base64',
      );

      const req = request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': Buffer.byteLength(payload),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => {
            data += chunk;
          });
          res.on('end', () => {
            if (
              res.statusCode &&
              res.statusCode >= 200 &&
              res.statusCode < 300
            ) {
              resolve(data);
            } else {
              reject(
                new Error(`WhatsApp request failed ${res.statusCode}: ${data}`),
              );
            }
          });
        },
      );

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }
}
