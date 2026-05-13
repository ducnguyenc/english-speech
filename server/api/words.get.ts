import { promises as fs } from 'fs'
import path from 'path'

export default defineEventHandler(async (event) => {
  const kvUrl = process.env.KV_REST_API_URL
  const kvToken = process.env.KV_REST_API_TOKEN

  // If on Vercel (with KV config)
  if (kvUrl && kvToken) {
    try {
      const response: any = await $fetch(`${kvUrl}/get/ipa_words`, {
        headers: { Authorization: `Bearer ${kvToken}` }
      })
      // Upstash REST returns { result: "stringified_value" }
      if (response && response.result) {
        return JSON.parse(response.result)
      }
    } catch (err) {
      console.error('KV Get Error:', err)
    }
  }

  // Fallback to local file
  const filePath = path.resolve(process.cwd(), 'data/words.json')
  try {
    const data = await fs.readFile(filePath, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return null
  }
})
