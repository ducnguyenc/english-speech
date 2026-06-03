export default defineEventHandler(async (event) => {
  const body = await readBody(event) as any[]
  if (!Array.isArray(body)) throw createError({ statusCode: 400, statusMessage: 'Body must be an array' })

  const supabase = useSupabase()

  // Replace entire word list: delete all then insert
  const { error: delError } = await supabase.from('words').delete().neq('id', '')
  if (delError) throw createError({ statusCode: 500, statusMessage: delError.message })

  if (body.length === 0) return { success: true }

  const rows = body.map(w => ({
    id:          w.id,
    english:     w.english     ?? '',
    ipa:         w.ipa         ?? '',
    vietnamese:  w.vietnamese  ?? '',
    lang:        w.lang        ?? 'en',
    image:       w.image       ?? '',
    day:         w.day         ?? 1,
  }))

  const { error: insError } = await supabase.from('words').insert(rows)
  if (insError) throw createError({ statusCode: 500, statusMessage: insError.message })

  return { success: true }
})
