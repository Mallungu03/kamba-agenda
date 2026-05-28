import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { SendEmailOptions } from '@/shared/interfaces/send-email-options.interface';
import { EnvService } from '@/config/env/env.service';

@Injectable()
export class EmailProvider {
  private readonly logger = new Logger(EmailProvider.name);
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;
  private readonly templateCache = new Map<
    string,
    HandlebarsTemplateDelegate
  >();

  constructor(private readonly env: EnvService) {
    this.from = env.smtpFrom;

    this.transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }

  async send(options: SendEmailOptions): Promise<void> {
    let html = options.html;

    // Compila template Handlebars sempre que um nome de template for fornecido.
    if (options.template) {
      html = this.renderTemplate(options.template, options.templateData ?? {});
    }

    await this.transporter.sendMail({
      from: this.from,
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: html ?? `<p>${options.text}</p>`,
    });
  }

  private renderTemplate(
    templateName: string,
    data: Record<string, unknown>,
  ): string {
    if (!this.templateCache.has(templateName)) {
      const templatePath = path.join(
        __dirname,
        '../templates',
        `${templateName}.hbs`,
      );

      if (fs.existsSync(templatePath)) {
        const source = fs.readFileSync(templatePath, 'utf8');
        this.templateCache.set(templateName, Handlebars.compile(source));
      } else {
        this.logger.warn(
          `Template "${templateName}" não encontrado em ${templatePath}. A usar fallback.`,
        );

        // Template genérico de fallback
        this.templateCache.set(
          templateName,
          Handlebars.compile(
            `<h1>{{title}}</h1><p>{{body}}</p><p>Equipa Reporta</p>`,
          ),
        );
      }
    }

    return this.templateCache.get(templateName)!(data);
  }
}
