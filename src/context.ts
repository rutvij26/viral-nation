import { PrismaClient } from '@prisma/client'
import { IncomingMessage } from 'http'

export interface Context {
  req?: IncomingMessage
  prisma: PrismaClient
  payload?: any
}

const prisma = new PrismaClient()

export const createContext = async (req: IncomingMessage) => ({
  prisma: prisma,
  req,
})
