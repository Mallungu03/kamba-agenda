export interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  template?: string;
  templateData?: Record<string, unknown>;
  html?: string;
}
