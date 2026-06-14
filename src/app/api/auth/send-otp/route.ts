import { NextRequest, NextResponse } from 'next/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: 'E-mail obrigatório.' }, { status: 400 })

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: users } = await admin.auth.admin.listUsers()
    const userExists = users?.users?.some((u) => u.email === email)
    if (!userExists) {
      return NextResponse.json({ error: 'E-mail não encontrado. Fale com a Malu.' }, { status: 404 })
    }

    const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email })
    if (error || !data?.properties?.email_otp) {
      return NextResponse.json({ error: 'Não foi possível gerar o código.' }, { status: 500 })
    }

    const otp = data.properties.email_otp
    const token_hash = data.properties.hashed_token

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#F5F0EB;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0EB;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">

          <!-- Header rosé -->
          <tr>
            <td style="background:#B07A80;padding:32px 40px;text-align:center;">
              <p style="margin:0;font-family:'Georgia',serif;font-size:22px;color:#FFFFFF;letter-spacing:2px;">
                Ateliê Malu Ribeiro
              </p>
              <p style="margin:6px 0 0;font-size:12px;color:rgba(255,255,255,0.75);letter-spacing:1px;">
                🏺 cerâmica artesanal
              </p>
            </td>
          </tr>

          <!-- Corpo -->
          <tr>
            <td style="padding:36px 40px 32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#6B5C5C;">Olá! Aqui está seu código de acesso:</p>

              <!-- OTP -->
              <div style="margin:24px 0;text-align:center;">
                <div style="display:inline-block;background:#FDF6F0;border:1.5px solid #E8D5C4;border-radius:14px;padding:20px 36px;">
                  <p style="margin:0;font-family:'Georgia',serif;font-size:42px;font-weight:bold;letter-spacing:14px;color:#B07A80;">
                    ${otp}
                  </p>
                </div>
              </div>

              <p style="margin:0 0 6px;font-size:13px;color:#9E8A8A;text-align:center;">
                Válido por <strong>1 hora</strong>
              </p>
              <p style="margin:16px 0 0;font-size:13px;color:#9E8A8A;text-align:center;">
                Se você não solicitou este código, pode ignorar este e-mail.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#FDF6F0;padding:20px 40px;text-align:center;border-top:1px solid #F0E4D8;">
              <p style="margin:0;font-size:11px;color:#B8A9A9;letter-spacing:0.5px;">
                Ateliê Malu Ribeiro · com carinho 🌸
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

    await resend.emails.send({
      from: 'Ateliê Malu Ribeiro <onboarding@resend.dev>',
      to: email,
      subject: `${otp} é seu código de acesso — Ateliê Malu Ribeiro`,
      html,
    })

    return NextResponse.json({ success: true, token_hash })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}