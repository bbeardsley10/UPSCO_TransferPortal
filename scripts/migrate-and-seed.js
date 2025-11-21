// Script to run migrations and seed database
// This runs automatically on startup in production

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// Manual seeding function as fallback
async function manualSeed() {
  console.log('🌱 Starting manual seed...');
  
  const locations = [
    { username: 'location1', location: 'Streator', password: 'password1', isAdmin: false },
    { username: 'location2', location: 'Bradley', password: 'password2', isAdmin: false },
    { username: 'location3', location: 'Bloomington', password: 'password3', isAdmin: false },
    { username: 'location4', location: 'Colorado Springs', password: 'password4', isAdmin: false },
    { username: 'location5', location: 'Matthews', password: 'password5', isAdmin: false },
  ];

  for (const loc of locations) {
    const hashedPassword = await bcrypt.hash(loc.password, 10);
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
    });
    console.log(`✅ Created/updated user: ${loc.username} (${loc.location})`);
  }

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
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
  });
  console.log('✅ Created/updated admin user: admin (password: admin123)');
  
  console.log('✅ Manual seed completed');
}

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
    console.log(`📊 Found ${userCount} users in database`);
    
    if (userCount === 0) {
      console.log('No users found, seeding database...');
      try {
        execSync('npm run seed', {
          stdio: 'inherit',
          cwd: process.cwd(),
          env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
        });
        console.log('✅ Database seeded successfully');
        
        // Verify seeding worked
        const newUserCount = await prisma.user.count();
        console.log(`✅ Verified: ${newUserCount} users now in database`);
      } catch (seedError) {
        console.error('❌ Seeding failed:', seedError.message);
        console.error('Full error:', seedError);
        // Try manual seeding as fallback
        console.log('🔄 Attempting manual seed...');
        await manualSeed();
      }
    } else {
      console.log(`✅ Database already has ${userCount} users, skipping seed`);
    }
  } catch (error) {
    console.error('⚠️  Error checking/seeding database:', error.message);
    console.error('Full error:', error);
    // Try manual seeding as fallback
    try {
      console.log('🔄 Attempting manual seed as fallback...');
      await manualSeed();
    } catch (manualError) {
      console.error('❌ Manual seed also failed:', manualError.message);
    }
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

