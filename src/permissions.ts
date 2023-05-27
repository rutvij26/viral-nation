import { isAuth } from './isAuth'
import { ruleType } from 'nexus-shield'
import { AuthenticationError } from 'apollo-server-errors'

export const isAuthenticated = ruleType({
  type: 'Mutation',
  resolve: (parent, args, context) => {
    const allowed = isAuth(context)
    if (!allowed) {
      throw new AuthenticationError('Not authorized')
    }
    return allowed
  },
})
