export default defineEventHandler(async () => {
  const supabase = useSupabase()
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, statusMessage: error.message })
  return data ?? []
})
