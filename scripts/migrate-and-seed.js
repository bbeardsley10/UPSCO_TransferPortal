// Script to run migrations and seed database
// This runs automatically on startup in production

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupDatabase() {
  // First, set up PostgreSQL migrations if needed
  console.log('🔄 Setting up PostgreSQL migrations...');
  try {
    execSync('node scripts/create-postgres-migration.js', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
  } catch (error) {
    console.error('⚠️  Migration setup warning:', error.message);
    // Continue anyway
  }

  console.log('🔄 Running database migrations...');
  
  try {
    // Run migrations
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }

  // Check if we should seed (only if no users exist)
  console.log('🌱 Checking if database needs seeding...');
  
  try {
    const userCount = await prisma.user.count();
    
    if (userCount === 0) {
      console.log('No users found, seeding database...');
      execSync('npm run seed', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Database seeded successfully');
    } else {
      console.log(`✅ Database already has ${userCount} users, skipping seed`);
    }
  } catch (error) {
    console.error('⚠️  Seeding failed (non-critical):', error.message);
    // Don't exit - seeding failure shouldn't prevent app from starting
  } finally {
    await prisma.$disconnect();
  }

  console.log('✅ Database setup complete');
}

// Run setup
setupDatabase()
  .then(() => {
    console.log('✅ Database setup complete, ready to start server');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  });

