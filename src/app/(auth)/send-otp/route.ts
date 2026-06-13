import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Verificar se o usuário existe
    const { data: users, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
    }

    const userExists = users.users.some((u) => u.email === email)
    if (!userExists) {
      return NextResponse.json(
        { error: 'E-mail não encontrado. Fale com a Malu para ter acesso.' },
        { status: 404 }
      )
    }

    // Gerar OTP via Supabase admin
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/`,
      },
    })

    if (error || !data.properties?.email_otp) {
      return NextResponse.json({ error: 'Não foi possível gerar o código.' }, { status: 500 })
    }

    const otp = data.properties.email_otp

    // Enviar via Resend
    const { error: sendError } = await resend.emails.send({
      from: 'Ateliê Malu Ribeiro <onboarding@resend.dev>',
      to: email,
      subject: 'Seu código de acesso — Ateliê Malu Ribeiro',
      html: `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin:0;padding:0;background:#F5F0EB;font-family:'Inter',system-ui,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:40px 16px;">
            <tr>
              <td align="center">
                <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;">

                  <!-- Logo + nome -->
                  <tr>
                    <td align="center" style="padding-bottom:32px;">
                      <p style="margin:0;font-size:24px;color:#B07A80;letter-spacing:2px;">✿</p>
                      <p style="margin:8px 0 2px;font-size:22px;color:#1A1A1A;font-style:italic;">Malu Ribeiro</p>
                      <p style="margin:0;font-size:11px;color:#7A6A6A;letter-spacing:4px;text-transform:uppercase;">Cerâmica Autoral</p>
                    </td>
                  </tr>

                  <!-- Card -->
                  <tr>
                    <td style="background:#FFFFFF;border-radius:16px;padding:40px 32px;box-shadow:0 1px 3px rgba(44,32,26,0.08);">
                      <p style="margin:0 0 8px;font-size:18px;color:#2E2020;font-weight:500;">Seu código de acesso</p>
                      <p style="margin:0 0 32px;font-size:14px;color:#7A6A6A;line-height:1.5;">
                        Use o código abaixo para entrar na plataforma do Ateliê Malu Ribeiro.
                      </p>

                      <!-- Código OTP -->
                      <div style="background:#F5F0EB;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                        <p style="margin:0 0 8px;font-size:11px;color:#7A6A6A;letter-spacing:3px;text-transform:uppercase;">Código</p>
                        <p style="margin:0;font-size:40px;font-weight:700;color:#B07A80;letter-spacing:12px;">${otp}</p>
                      </div>

                      <p style="margin:0;font-size:13px;color:#7A6A6A;text-align:center;line-height:1.5;">
                        Este código expira em <strong>1 hora</strong> e só pode ser usado uma vez.<br>
                        Se você não solicitou este código, ignore este e-mail.
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding-top:24px;">
                      <p style="margin:0;font-size:12px;color:#B8AAAB;">
                        Ateliê Malu Ribeiro · Uberlândia, MG
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    if (sendError) {
      return NextResponse.json({ error: 'Não foi possível enviar o e-mail.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}