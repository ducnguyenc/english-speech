export default defineEventHandler(async (event) => {
    const config = useRuntimeConfig()
    const azureKey = config.azureKey
    const azureRegion = config.public.azureRegion

    if (!azureKey) {
        throw createError({
            statusCode: 500,
            statusMessage: 'Azure key not configured'
        })
    }

    const endpoint = `https://${azureRegion}.api.cognitive.microsoft.com/sts/v1.0/issueToken`

    try {
        const response = await $fetch<string>(endpoint, {
            method: 'POST',
            headers: {
                'Ocp-Apim-Subscription-Key': azureKey,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            responseType: 'text'
        })

        return {
            token: response,
            region: azureRegion
        }
    } catch (error) {
        console.error('Error fetching Azure token:', error)
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to fetch Azure token'
        })
    }
})
