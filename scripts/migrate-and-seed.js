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

  console.log('🔄 Syncing database schema...');
  
  try {
    // Use db push instead of migrate deploy - it's simpler and handles schema sync
    // This will create/update tables based on the schema without needing migrations
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✅ Database schema synced successfully');
  } catch (error) {
    console.error('❌ Database sync failed:', error.message);
    // Try to resolve failed migrations first
    try {
      console.log('🔄 Attempting to resolve failed migrations...');
      execSync('npx prisma migrate resolve --rolled-back 20250120000000_init_postgresql', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      // Try db push again
      execSync('npx prisma db push --accept-data-loss', {
        stdio: 'inherit',
        cwd: process.cwd(),
      });
      console.log('✅ Database schema synced after resolving migrations');
    } catch (resolveError) {
      console.error('❌ Could not resolve migrations, trying direct db push...');
      // Last resort: just try db push
      try {
        execSync('npx prisma db push --accept-data-loss --skip-generate', {
          stdio: 'inherit',
          cwd: process.cwd(),
        });
        console.log('✅ Database schema synced');
      } catch (finalError) {
        console.error('❌ All database sync attempts failed');
        await prisma.$disconnect();
        process.exit(1);
      }
    }
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

