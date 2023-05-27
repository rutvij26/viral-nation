import 'dotenv/config'
import { ApolloServer } from '@apollo/server'
import { startStandaloneServer } from '@apollo/server/standalone'
import { schema } from './schema'
import { Context, createContext } from './context'
import { IncomingMessage, ServerResponse } from 'http'

const start = async () => {
  const server = new ApolloServer<Context>({ schema })

  const { url } = await startStandaloneServer<Context>(server, {
    listen: { port: 4000 },
    context: async ({
      req,
      res,
    }: {
      req: IncomingMessage
      res: ServerResponse
    }) => {
      return createContext(req)
    },
  })

  console.log(`\
  🚀 Server ready at: ${url}
  `)
}

start()
