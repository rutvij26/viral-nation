import { asNexusMethod, intArg, makeSchema, objectType } from 'nexus'
import { Context } from './context'
import { DateTimeResolver } from 'graphql-scalars'

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
    // Query All Users
    t.nonNull.list.nonNull.field('allUsers', {
      type: User,
      resolve: (_parent, _args, context: Context) => {
        return context.prisma.user.findMany()
      },
    })

    // Query All Movies -> should include sorting, filtering and pagination
    t.nonNull.list.field('allMovies', {
      type: Movie,
      resolve: (_parent, _args, context: Context) => {
        return context.prisma.movie.findMany()
      },
    })

    // Query Movie by id
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

export const schema = makeSchema({
  types: [User, Movie, Query, DateTime],
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
