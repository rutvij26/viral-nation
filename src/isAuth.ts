import { verify } from 'jsonwebtoken'
import { Context } from './context'

export const isAuth = (context: Context) => {
  const authorization = context.req?.headers['authorization'] // should be bearer token

  if (!authorization) {
    throw new Error('No authorization header')
  }
  try {
    const token = authorization.split(' ')[1]
    const payload = verify(token, process.env.ACCESS_TOKEN_SECRET!)
    context.payload = payload
    return true
  } catch (e) {
    console.error(e)
    throw new Error('Invalid authorization header')
  }
}
