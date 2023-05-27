import {
  asNexusMethod,
  intArg,
  makeSchema,
  nonNull,
  objectType,
  stringArg,
} from 'nexus'
import { Context } from './context'
import { DateTimeResolver } from 'graphql-scalars'
import { compare, hash } from 'bcryptjs'

const DateTime = asNexusMethod(DateTimeResolver, 'date')

const User = objectType({
  name: 'User',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('username')
    t.nonNull.string('email')
    t.nonNull.string('password')
    t.list.field('movies', {
      type: Movie,
      resolve: (parent, args, context) => {
        return context.prisma.movie.findMany({
          where: {
            createdById: parent.id,
          },
        })
      },
    })
  },
})

const Movie = objectType({
  name: 'Movie',
  definition(t) {
    t.nonNull.int('id')
    t.nonNull.string('movieName')
    t.nonNull.string('description')
    t.nonNull.string('directorName')
    t.field('releaseDate', { type: 'DateTime' })
    t.field('createdBy', {
      type: User,
      resolve: (parent, args, context) => {
        return context.prisma.user.findUnique({
          where: {
            id: parent.createdById!,
          },
        })
      },
    })
    t.int('createdById')
  },
})

const Query = objectType({
  name: 'Query',
  definition(t) {
    /** Query All Users */
    t.nonNull.list.nonNull.field('allUsers', {
      type: User,
      resolve: (_parent, _args, context: Context) => {
        return context.prisma.user.findMany()
      },
    })

    /** Query All Movies
     *  Constraints: should include sorting, filtering, pagination
     *  */
    t.nonNull.list.field('allMovies', {
      type: Movie,
      resolve: (_parent, _args, context: Context) => {
        return context.prisma.movie.findMany()
      },
    })

    /** Query Movie by id
     *  Required arguments: id
     */
    t.nullable.field('movieById', {
      type: Movie,
      args: {
        id: intArg(),
      },
      resolve: (_parent, args, context: Context) => {
        return context.prisma.movie.findUnique({
          where: { id: args.id || undefined },
        })
      },
    })

    /** Search Movies By Name or Description
     *  */
  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    /** TODO: Sign Up User
     *  Constraints: Password should be hashed before being sent to the server, JWT should be sent after registration
     * */
    t.nonNull.field('createUser', {
      type: 'User',
      args: {
        username: nonNull(stringArg()),
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, args, context: Context) => {
        try {
          const userCheck = await context.prisma.user.findFirst({
            where: {
              email: args.email!,
            },
          })

          if (userCheck !== null) {
            console.log(`User with email ${userCheck} already exists`)
            throw new Error('User already exists!')
          }

          const hashedPassword = await hash(args.password, 12)

          return context.prisma.user.create({
            data: {
              username: args.username,
              email: args.email,
              password: hashedPassword,
            },
          })
        } catch (error) {
          console.log(error)
          throw new Error(`${error}`)
        }
      },
    })

    /** TODO: Sign In User
     *  Constraints:  Password should be hashed before being sent to the server
     *                JWT Token should be provided upon login
     * */

    t.field('loginUser', {
      type: 'String',
      args: {
        email: nonNull(stringArg()),
        password: nonNull(stringArg()),
      },
      resolve: async (_parent, args, context: Context) => {
        try {
          const user = await context.prisma.user.findFirst({
            where: {
              email: args.email,
            },
          })

          if (!user) {
            throw new Error(`User not found!`)
          }

          const validatePasword = await compare(args.password, user.password)

          if (!validatePasword) {
            throw new Error(`Invalid password!`)
          }

          return 'Login Successful!'
        } catch (error) {
          console.log(error)
          throw new Error(`${error}`)
        }
      },
    })

    /** TODO: Change Password
     *  Requried Arguments: email, currentPassword, newPassword
     *  */

    t.field('changePassword', {
      type: 'String',
      args: {
        email: nonNull(stringArg()),
        currentPassword: nonNull(stringArg()),
        newPassword: nonNull(stringArg()),
      },
      resolve: async (_parent, args, context: Context) => {
        try {
          const user = await context.prisma.user.findFirst({
            where: {
              email: args.email,
            },
          })
          if (!user) {
            throw new Error(`User not found!`)
          }
          // checking if the password is the same
          const validatePasword = await compare(
            args.currentPassword,
            user.password,
          )
          if (!validatePasword) {
            throw new Error(`Invalid Current Password!`)
          }
          const hashedPassword = await hash(args.newPassword, 12)
          await context.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              password: hashedPassword,
            },
          })
          return 'Password Changed!'
        } catch (error) {
          console.log(error)
          throw new Error(`${error}`)
        }
      },
    })

    /** TODO: Create a Movie
     *  Requests should be authenticated using a JWT token in header
     *  Arguments:
     *  */
    /** TODO: Update a Movie
     *  Requests should be authenticated using a JWT token in header
     *  Arguments:
     *  */
    /** TODO: Delete a Movie
     *  Requests should be authenticated using a JWT token in header
     *  Arguments:
     *  */
  },
})

export const schema = makeSchema({
  types: [User, Movie, Query, Mutation, DateTime],
  outputs: {
    schema: __dirname + '/schema.graphql',
    typegen: __dirname + '/generated/nexus.ts',
  },
  contextType: {
    module: require.resolve('./context'),
    export: 'Context',
  },
  sourceTypes: {
    modules: [
      {
        module: '@prisma/client',
        alias: 'prisma',
      },
    ],
  },
})
