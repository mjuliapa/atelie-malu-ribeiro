if (action === 'create_quantity_column_pgmeta') {
    const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    try {
      const res = await fetch(`${projectUrl}/pg-meta/default/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          table: 'pieces',
          name: 'quantity',
          type: 'integer',
          default_value: '1',
          is_nullable: false,
        }),
      })

      const result = await res.json()
      return NextResponse.json({ status: res.status, result })
    } catch (err: any) {
      return NextResponse.json({ error: err.message })
    }
  }