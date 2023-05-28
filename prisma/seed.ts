import { PrismaClient, Prisma } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const hashedPassword = async (pwd: string) => {
  return await hash(pwd, 12)
}

const userDataArray = [
  {
    username: 'Alice',
    email: 'alice@prisma.io',
    password: 'alice',
    movies: {
      create: [
        {
          movieName: 'The Shawshank Redemption',
          description:
            'Two imprisoned men bond over several years, finding solace and eventual redemption through acts of common decency.',
          directorName: 'Frank Darabont',
          releaseDate: new Date('1994-09-22'),
        },
      ],
    },
  },
  {
    username: 'Bob',
    email: 'bob@prisma.io',
    password: 'bob',
    movies: {
      create: [
        {
          movieName: 'The Godfather',
          description:
            'The aging patriarch of an organized crime dynasty transfers control of his clandestine empire to his reluctant son.',
          directorName: 'Francis Ford Coppola',
          releaseDate: new Date('1972-03-24'),
        },
      ],
    },
  },
  // Add four more objects following the same structure...
  {
    username: 'Charlie',
    email: 'charlie@prisma.io',
    password: 'charlie',
    movies: {
      create: [
        {
          movieName: 'Pulp Fiction',
          description:
            'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
          directorName: 'Quentin Tarantino',
          releaseDate: new Date('1994-10-14'),
        },
      ],
    },
  },
  {
    username: 'David',
    email: 'david@prisma.io',
    password: 'david',
    movies: {
      create: [
        {
          movieName: 'The Dark Knight',
          description:
            'When the menace known as The Joker emerges from his mysterious past, he wreaks havoc and chaos on the people of Gotham.',
          directorName: 'Christopher Nolan',
          releaseDate: new Date('2008-07-18'),
        },
      ],
    },
  },
  {
    username: 'Eve',
    email: 'eve@prisma.io',
    password: 'eve',
    movies: {
      create: [
        {
          movieName: 'Inception',
          description:
            'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
          directorName: 'Christopher Nolan',
          releaseDate: new Date('2010-07-16'),
        },
      ],
    },
  },
  {
    username: 'Frank',
    email: 'frank@prisma.io',
    password: 'frank',
    movies: {
      create: [
        {
          movieName: 'The Matrix',
          description:
            'A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.',
          directorName: 'Lana Wachowski, Lilly Wachowski',
          releaseDate: new Date('1999-03-31'),
        },
      ],
    },
  },
]

async function main() {
  const passwordHashedUserData = await Promise.all(
    userDataArray.map(async (user) => {
      const hashedPwd = await hashedPassword(user.password)
      return {
        ...user,
        password: hashedPwd,
      }
    }),
  )

  const userData: Prisma.UserCreateInput[] = passwordHashedUserData
  console.log(`Start seeding ...`)
  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    })
    console.log(`Created user with id: ${user.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
  })
