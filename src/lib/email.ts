import nodemailer from 'nodemailer'

function createTransport() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const FROM = process.env.SMTP_FROM ?? 'DataChart <no-reply@datachart.app>'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

// ─────────────────────────────────────────────
// Password reset
// ─────────────────────────────────────────────

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`

  await createTransport().sendMail({
    from: FROM,
    to,
    subject: 'Redefinição de senha — DataChart',
    html: passwordResetHtml(resetUrl),
    text: `Acesse o link para redefinir sua senha: ${resetUrl}\n\nEste link expira em 1 hora.`,
  })
}

// ─────────────────────────────────────────────
// Chart share
// ─────────────────────────────────────────────

export interface ShareChartOptions {
  to: string
  senderName: string
  chartTitle: string
  chartId: string
  message?: string
}

export async function sendChartShareEmail(opts: ShareChartOptions): Promise<void> {
  const chartUrl = `${APP_URL}/dashboard/charts/${opts.chartId}`

  await createTransport().sendMail({
    from: FROM,
    to: opts.to,
    subject: `${opts.senderName} compartilhou um gráfico com você — DataChart`,
    html: chartShareHtml({ ...opts, chartUrl }),
    text: [
      `${opts.senderName} compartilhou o gráfico "${opts.chartTitle}" com você.`,
      opts.message ? `\nMensagem: ${opts.message}` : '',
      `\nVer gráfico: ${chartUrl}`,
    ]
      .filter(Boolean)
      .join(''),
  })
}

// ─────────────────────────────────────────────
// Data share (sends a CSV attachment)
// ─────────────────────────────────────────────

export interface ShareDataOptions {
  to: string
  senderName: string
  dataTitle: string
  csvContent: string
  message?: string
}

export async function sendDataShareEmail(opts: ShareDataOptions): Promise<void> {
  await createTransport().sendMail({
    from: FROM,
    to: opts.to,
    subject: `${opts.senderName} compartilhou dados com você — DataChart`,
    html: dataShareHtml(opts),
    text: [
      `${opts.senderName} compartilhou o dataset "${opts.dataTitle}" com você.`,
      opts.message ? `\nMensagem: ${opts.message}` : '',
      '\nOs dados estão em anexo (CSV).',
    ]
      .filter(Boolean)
      .join(''),
    attachments: [
      {
        filename: `${opts.dataTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`,
        content: opts.csvContent,
        contentType: 'text/csv; charset=utf-8',
      },
    ],
  })
}

// ─────────────────────────────────────────────
// HTML templates
// ─────────────────────────────────────────────

function layout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; padding: 0; background: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .wrapper { max-width: 560px; margin: 40px auto; padding: 0 16px; }
    .card { background: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .logo { font-size: 18px; font-weight: 700; color: #1d4ed8; margin-bottom: 32px; }
    h1 { font-size: 20px; font-weight: 600; color: #111827; margin: 0 0 12px; }
    p { font-size: 14px; color: #6b7280; line-height: 1.6; margin: 0 0 20px; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 8px 0 24px; }
    .footer { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 24px; }
    .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
    .message-box { background: #f3f4f6; border-radius: 8px; padding: 14px 16px; font-size: 14px; color: #374151; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="logo">DataChart</div>
      ${content}
    </div>
    <p class="footer">© ${new Date().getFullYear()} DataChart. Este e-mail foi enviado automaticamente.</p>
  </div>
</body>
</html>`
}

function passwordResetHtml(resetUrl: string): string {
  return layout(`
    <h1>Redefinição de senha</h1>
    <p>Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.</p>
    <a href="${resetUrl}" class="btn">Redefinir senha</a>
    <hr class="divider" />
    <p style="font-size:12px;color:#9ca3af">
      Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.<br/>
      Este link expira em <strong>1 hora</strong>.
    </p>
  `)
}

function chartShareHtml(opts: ShareChartOptions & { chartUrl: string }): string {
  return layout(`
    <h1>${escapeHtml(opts.senderName)} compartilhou um gráfico com você</h1>
    <p>Você recebeu o gráfico <strong>${escapeHtml(opts.chartTitle)}</strong>.</p>
    ${opts.message ? `<div class="message-box">${escapeHtml(opts.message)}</div>` : ''}
    <a href="${opts.chartUrl}" class="btn">Ver gráfico</a>
    <hr class="divider" />
    <p style="font-size:12px;color:#9ca3af">
      Para visualizar o gráfico é necessário ter uma conta no DataChart.
    </p>
  `)
}

function dataShareHtml(opts: ShareDataOptions): string {
  return layout(`
    <h1>${escapeHtml(opts.senderName)} compartilhou dados com você</h1>
    <p>O dataset <strong>${escapeHtml(opts.dataTitle)}</strong> está em anexo no formato CSV.</p>
    ${opts.message ? `<div class="message-box">${escapeHtml(opts.message)}</div>` : ''}
    <p>Abra o arquivo CSV anexo com Excel, Google Sheets ou qualquer editor de planilhas.</p>
  `)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
