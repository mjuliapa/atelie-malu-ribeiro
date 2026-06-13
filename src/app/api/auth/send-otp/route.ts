import { NextRequest, NextResponse } from "next/server"
import { createClient as createSupabaseAdmin } from "@supabase/supabase-js"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) return NextResponse.json({ error: "E-mail obrigatorio." }, { status: 400 })

    const admin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: users } = await admin.auth.admin.listUsers()
    const userExists = users?.users?.some((u) => u.email === email)
    if (!userExists) {
      return NextResponse.json({ error: "E-mail nao encontrado. Fale com a Malu." }, { status: 404 })
    }

    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email })

    if (error || !data?.properties?.email_otp) {
      return NextResponse.json({ error: "Nao foi possivel gerar o codigo." }, { status: 500 })
    }

    const otp = data.properties.email_otp
    const token_hash = data.properties.hashed_token

    await resend.emails.send({
      from: "Atelie Malu Ribeiro <onboarding@resend.dev>",
      to: email,
      subject: "Seu codigo de acesso",
      html: "<div style='font-family:sans-serif;padding:40px;'><h2>Seu codigo: <strong style='color:#B07A80;font-size:32px;letter-spacing:8px;'>" + otp + "</strong></h2><p>Expira em 1 hora.</p></div>",
    })

    return NextResponse.json({ success: true, token_hash })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: "Erro interno." }, { status: 500 })
  }
}