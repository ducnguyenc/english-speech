import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const kvUrl = process.env.KV_REST_API_URL
  const kvToken = process.env.KV_REST_API_TOKEN

  // Save to Vercel KV (Upstash) using REST Command API for better JSON handling
  if (kvUrl && kvToken) {
    try {
      await $fetch(kvUrl, {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', 'ipa_words', JSON.stringify(body)])
      })
      return { success: true, mode: 'cloud' }
    } catch (err) {
      console.error('KV Set Error:', err)
      // If cloud fails, it will continue to local fallback
    }
  }

  // Fallback to local file
  const dataDir = path.resolve(process.cwd(), 'data')
  const filePath = path.join(dataDir, 'words.json')

  try {
    await fs.mkdir(dataDir, { recursive: true })
    await fs.writeFile(filePath, JSON.stringify(body, null, 2), 'utf-8')
    return { success: true, mode: 'local' }
  } catch (error) {
    console.error('Local Save Error:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Could not save data.',
    })
  }
})
