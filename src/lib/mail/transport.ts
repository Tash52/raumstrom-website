// SMTP transport (nodemailer) with mandatory TLS: implicit TLS on 465 (SMTP_SECURE=true) or STARTTLS
// with requireTLS (SMTP_SECURE=false). Certificates are always verified. No file or URL access for
// attachments, so content can only come from in-memory buffers.
import nodemailer, { type SendMailOptions, type Transporter } from 'nodemailer';

export interface SmtpEnv {
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_SECURE: boolean;
  SMTP_USER: string;
  SMTP_PASS: string;
}

export const SMTP_TIMEOUTS = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 30_000 } as const;

let transporter: Transporter | undefined;

export function erzeugeTransport(env: SmtpEnv): Transporter {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    requireTLS: !env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: true },
    ...SMTP_TIMEOUTS,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  });
}

export function transport(env: SmtpEnv): Transporter {
  transporter ??= erzeugeTransport(env);
  return transporter;
}

export async function sende(env: SmtpEnv, mail: SendMailOptions): Promise<void> {
  await transport(env).sendMail(mail);
}
