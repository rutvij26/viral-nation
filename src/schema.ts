import {
  arg,
  asNexusMethod,
  enumType,
  inputObjectType,
  intArg,
  makeSchema,
  nonNull,
  objectType,
  stringArg,
} from 'nexus'
import { Context } from './context'
import { DateTimeResolver } from 'graphql-scalars'
import { compare, hash } from 'bcryptjs'
import { createAccessToken } from './auth'
import { nexusShield, allow } from 'nexus-shield'
import { isAuthenticated } from './permissions'
import { ForbiddenError } from 'apollo-server-errors'

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
      resolve: (_parent, args, context: Context) => {
        return context.prisma.user.findMany()
      },
    })

    /** Query All Movies
     *  Constraints: should include sorting, filtering, pagination and search
     *  */
    t.nonNull.list.field('allMovies', {
      type: Movie,
      args: {
        searchString: stringArg(),
        skip: intArg(), // pagination start value
        take: intArg(), // pagination limit value
        movieFilters: arg({
          type: 'MovieFilterInput',
        }),
        userFilters: arg({
          type: 'MovieUserFilterInput',
        }),
        orderBy: arg({
          type: 'MovieOrderBy',
        }),
      },
      resolve: (_parent, args, context: Context) => {
        const searchFilter = args.searchString
          ? {
              OR: [
                { movieName: { contains: args.searchString } },
                { description: { contains: args.searchString } },
              ],
            }
          : {}

        const movieFilter = args.movieFilters
          ? {
              AND: Object.entries(args.movieFilters).map(([key, value]) => {
                return value !== null ? { [key]: value } : {}
              }),
            }
          : {}

        const userFilter = args.userFilters
          ? {
              createdBy: {
                OR: Object.entries(args.userFilters).map(([key, value]) => {
                  return {
                    [key]: value,
                  }
                }),
              },
            }
          : {}

        const filters = {
          ...searchFilter,
          ...movieFilter,
          ...userFilter,
        }

        return context.prisma.movie.findMany({
          include: { createdBy: true },
          where: { ...filters },
          skip: args.skip || undefined,
          take: args.take || undefined,
          orderBy: args.orderBy || undefined,
        })
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
  },
})

const Mutation = objectType({
  name: 'Mutation',
  definition(t) {
    /** TODO: Sign Up User
     *  Constraints: Password should be hashed before being sent to the server, JWT should be sent after registration
     * */
    t.nonNull.field('createUser', {
      type: JwtPayload,
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

          const newUser = await context.prisma.user.create({
            data: {
              username: args.username,
              email: args.email,
              password: hashedPassword,
            },
          })

          return {
            accessToken: createAccessToken(newUser),
          }
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
      type: JwtPayload,
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

          return {
            accessToken: createAccessToken(user),
          }
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
     *  Arguments: movieName!, description!, directorName!, releaseDate!
     *  */
    t.field('createMovie', {
      type: 'Movie',
      args: {
        movieName: nonNull(stringArg()),
        description: nonNull(stringArg()),
        directorName: nonNull(stringArg()),
        releaseDate: nonNull('DateTime'),
      },
      shield: isAuthenticated,
      resolve: async (_parent, args, context: Context) => {
        try {
          return context.prisma.movie.create({
            data: {
              movieName: args.movieName,
              description: args.description,
              directorName: args.directorName,
              releaseDate: args.releaseDate,
              createdById: context.payload.userId,
            },
          })
        } catch (error) {
          throw new Error(`${error}`)
        }
      },
    })

    /** TODO: Update a Movie
     *  Requests should be authenticated using a JWT token in header
     *  Arguments: id!, movieName?, description?, directorName?, releaseDate?
     *  */

    t.field('updateMovieById', {
      type: 'Movie',
      shield: isAuthenticated,
      args: {
        id: nonNull(intArg()),
        movieName: stringArg(),
        description: stringArg(),
        directorName: stringArg(),
        releaseDate: 'DateTime',
      },
      resolve: async (_parent, args, context: Context) => {
        try {
          return context.prisma.movie.update({
            where: {
              id: args.id,
            },
            data: {
              movieName: args.movieName,
              description: args?.description,
              directorName: args?.directorName,
              releaseDate: args?.releaseDate,
              createdById: context.payload.userId,
            },
          })
        } catch (error) {
          throw new Error(`${error}`)
        }
      },
    })

    /** TODO: Delete a Movie
     *  Requests should be authenticated using a JWT token in header
     *  Arguments: id!
     *  */
    t.field('deleteMovieById', {
      type: 'String',
      shield: isAuthenticated,
      args: {
        id: nonNull(intArg()),
      },
      resolve: async (_parent, args, context: Context) => {
        try {
          await context.prisma.movie.delete({
            where: {
              id: args.id,
            },
          })
          return `Movie with id: ${args.id} is Deleted `
        } catch (error) {
          throw new Error(`${error}`)
        }
      },
    })
  },
})

const JwtPayload = objectType({
  name: 'JwtPayload',
  definition(t) {
    t.nonNull.field('accessToken', {
      type: 'String',
    })
  },
})

const SortOrder = enumType({
  name: 'SortOrder',
  members: ['asc', 'desc'],
})

const MovieOrderBy = inputObjectType({
  name: 'MovieOrderBy',
  definition(t) {
    t.nonNull.field('releaseDate', {
      type: 'SortOrder',
    })
  },
})

const MovieFilterInput = inputObjectType({
  name: 'MovieFilterInput',
  definition(t) {
    t.nullable.string('movieName')
    t.nullable.int('createdById')
  },
})

const MovieUserFilterInput = inputObjectType({
  name: 'MovieUserFilterInput',
  definition(t) {
    t.nullable.string('email')
  },
})

export const schema = makeSchema({
  types: [
    User,
    Movie,
    Query,
    Mutation,
    DateTime,
    JwtPayload,
    MovieOrderBy,
    SortOrder,
    MovieFilterInput,
    MovieUserFilterInput,
  ],
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
  plugins: [
    nexusShield({
      defaultError: new ForbiddenError('Unauthorized'),
      defaultRule: allow,
    }),
  ],
})
