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
      return NextResponse.json(
        { error: 'E-mail não encontrado. Fale com a Malu para ter acesso.' },
        { status: 404 }
      )
    }

    const { data, error } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (error || !data?.properties?.email_otp) {
      console.error('generateLink error:', error)
      return NextResponse.json({ error: 'Não foi possível gerar o código.' }, { status: 500 })
    }

    const otp = data.properties.email_otp
    const token_hash = data.properties.hashed_token

    const { error: sendError } = await resend.emails.send({
      from: 'Ateliê Malu Ribeiro <onboarding@resend.dev>',
      to: email,
      subject: 'Seu código de acesso — Ateliê Malu Ribeiro',
      html: `
        <div style="background:#F5F0EB;padding:40px 16px;font-family:system-ui,sans-serif;">
          <div style="max-width:480px;margin:0 auto;">
            <div style="text-align:center;margin-bottom:32px;">
              <p style="font-size:22px;color:#B07A80;margin:0;">✿</p>
              <p style="font-size:20px;color:#1A1A1A;font-style:italic;margin:8px 0 2px;">Malu Ribeiro</p>
              <p style="font-size:11px;color:#7A6A6A;letter-spacing:4px;text-transform:uppercase;margin:0;">Cerâmica Autoral</p>
            </div>
            <div style="background:#fff;border-radius:16px;padding:40px 32px;">
              <p style="font-size:18px;color:#2E2020;margin:0 0 8px;">Seu código de acesso</p>
              <p style="font-size:14px;color:#7A6A6A;margin:0 0 32px;">Use o código abaixo para entrar na plataforma.</p>
              <div style="background:#F5F0EB;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;">
                <p style="font-size:11px;color:#7A6A6A;letter-spacing:3px;text-transform:uppercase;margin:0 0 8px;">Código</p>
                <p style="font-size:40px;font-weight:700;color:#B07A80;letter-spacing:12px;margin:0;">${otp}</p>
              </div>
              <p style="font-size:13px;color:#7A6A6A;text-align:center;margin:0;">
                Expira em <strong>1 hora</strong>. Use apenas uma vez.
              </p>
            </div>
          </div>
        </div>
      `,
    })

    if (sendError) {
      console.error('Resend error:', sendError)
      return NextResponse.json({ error: 'Não foi possível enviar o e-mail.' }, { status: 500 })
    }

    return NextResponse.json({ success: true, token_hash })
  } catch (e) {
    console.error('send-otp error:', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}