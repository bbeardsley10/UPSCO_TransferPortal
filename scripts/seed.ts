import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create 5 locations/users
  // Edit the 'location' field below to change the display names
  // The 'username' is used for login, and 'password' is the login password
  const locations = [
    { username: 'location1', location: 'Streator', password: 'password1', isAdmin: false },
    { username: 'location2', location: 'Bradley', password: 'password2', isAdmin: false },
    { username: 'location3', location: 'Bloomington', password: 'password3', isAdmin: false },
    { username: 'location4', location: 'Colorado Springs', password: 'password4', isAdmin: false },
    { username: 'location5', location: 'Matthews', password: 'password5', isAdmin: false },
  ]

  for (const loc of locations) {
    const hashedPassword = await bcrypt.hash(loc.password, 10)
    await prisma.user.upsert({
      where: { username: loc.username },
      update: {
        location: loc.location,
        password: hashedPassword,
        isAdmin: loc.isAdmin,
      },
      create: {
        username: loc.username,
        location: loc.location,
        password: hashedPassword,
        isAdmin: loc.isAdmin,
      },
    })
    console.log(`Created/updated user: ${loc.username} (${loc.location})`)
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      location: 'Admin',
      password: adminPassword,
      isAdmin: true,
    },
    create: {
      username: 'admin',
      location: 'Admin',
      password: adminPassword,
      isAdmin: true,
    },
  })
  console.log('Created/updated admin user: admin (Admin)')

  console.log('\nSeeding completed!')
  console.log('\nDefault credentials:')
  locations.forEach(loc => {
    console.log(`  ${loc.location}: username="${loc.username}", password="${loc.password}"`)
  })
  console.log(`  Admin: username="admin", password="admin123"`)
  console.log('\n⚠️  IMPORTANT: Change the admin password after first login!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

