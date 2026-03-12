import OpenAI from 'openai'

/**
 * Raven Demo — Use OpenAI through Raven's AI Gateway
 *
 * Prerequisites:
 * 1. Start the Raven API: pnpm dev:api
 * 2. Sign in to the dashboard and add an OpenAI provider with your API key
 * 3. Create a virtual key (you'll get a rk_live_* key)
 * 4. Set RAVEN_API_KEY below or as an environment variable
 */

const RAVEN_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
const RAVEN_KEY = process.env.RAVEN_API_KEY ?? ''

if (!RAVEN_KEY) {
  console.error(
    '\nMissing RAVEN_API_KEY. To get one:\n' +
      '  1. Go to http://localhost:3000/keys\n' +
      '  2. Create a new virtual key\n' +
      '  3. Copy the key (rk_live_...)\n' +
      '  4. Run: RAVEN_API_KEY=rk_live_xxx pnpm --filter @raven/demo start\n',
  )
  process.exit(1)
}

// Point the OpenAI client at Raven's proxy instead of api.openai.com
const client = new OpenAI({
  apiKey: RAVEN_KEY,
  baseURL: `${RAVEN_URL}/v1/proxy/openai`,
})

async function chatCompletion() {
  console.log('--- Chat Completion ---\n')

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Keep answers brief.' },
      { role: 'user', content: 'What is an AI gateway and why would I use one?' },
    ],
  })

  console.log('Model:', response.model)
  console.log('Usage:', response.usage)
  console.log('\nResponse:', response.choices[0]?.message?.content)
}

async function streamingChat() {
  console.log('\n--- Streaming Chat ---\n')

  const stream = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: 'Write a haiku about API gateways.' }],
    stream: true,
  })

  process.stdout.write('Response: ')
  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content
    if (content) {
      process.stdout.write(content)
    }
  }
  console.log('\n')
}

async function main() {
  console.log(`\nRaven Demo — Proxying OpenAI through ${RAVEN_URL}\n`)

  try {
    await chatCompletion()
    await streamingChat()
    console.log('All requests were routed through Raven.')
    console.log('Check the dashboard at http://localhost:3000/requests to see the logs.\n')
  } catch (err) {
    if (err instanceof OpenAI.APIError) {
      console.error(`\nAPI Error: ${err.status} ${err.message}`)
      if (err.status === 401) {
        console.error('Check that your RAVEN_API_KEY is valid.')
      }
      if (err.status === 404) {
        console.error('Check that you have an OpenAI provider configured in the dashboard.')
      }
    } else {
      throw err
    }
  }
}

main()
