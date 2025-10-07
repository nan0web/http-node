import { createServer, fetch, post } from '@nan0web/http-node'
import { bodyParser } from '@nan0web/http-node/middlewares'

async function main() {
  console.log('Starting @nan0web/http-node playground...')

  // Example 1: Create and start a basic HTTP server
  const server = createServer()
  server.get('/hello', (req, res) => {
    res.json({ message: 'Hello World from playground!' })
  })
  server.use(bodyParser())
  server.post('/echo', (req, res) => {
    res.json({ received: req.body, timestamp: Date.now() })
  })

  await server.listen()
  const port = server.port
  console.log(`Server listening on http://localhost:${port}`)

  // Example 2: Make a GET request using fetch
  console.log('\n--- GET Request ---')
  const getResponse = await fetch(`http://localhost:${port}/hello`)
  const getData = await getResponse.json()
  console.log('GET Response:', getData)

  // Example 3: Make a POST request
  console.log('\n--- POST Request ---')
  const postData = { name: 'Playground User', action: 'test' }
  const postResponse = await post(`http://localhost:${port}/echo`, postData)
  const postResult = await postResponse.json()
  console.log('POST Response:', postResult)

  // Verify responses
  if (getData.message === 'Hello World from playground!' && postResult.received.name === 'Playground User') {
    console.log('\n✅ Playground demos passed!')
  } else {
    console.log('\n❌ Playground demos failed.')
  }

  // Cleanup
  await server.close()
  console.log('\nServer closed. Playground complete.')
}

main().catch(console.error)