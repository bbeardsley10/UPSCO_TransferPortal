// Script to run migrations and seed database
// This runs automatically on startup in production

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

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
  process.exit(1);
}

// Check if we should seed (only if no users exist)
console.log('🌱 Checking if database needs seeding...');

try {
  // Try to check if users exist by running a simple Prisma query
  // We'll use a Node script to check
  const checkUsersScript = `
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    prisma.user.count()
      .then(count => {
        if (count === 0) {
          console.log('No users found, seeding database...');
          process.exit(0); // Exit 0 means seed
        } else {
          console.log(\`Found \${count} users, skipping seed\`);
          process.exit(1); // Exit 1 means skip seed
        }
      })
      .catch(err => {
        console.error('Error checking users:', err);
        process.exit(1);
      })
      .finally(() => {
        prisma.$disconnect();
      });
  `;
  
  fs.writeFileSync(path.join(process.cwd(), 'check-users.js'), checkUsersScript);
  
  try {
    execSync('node check-users.js', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    
    // If we get here, we should seed
    console.log('🌱 Seeding database...');
    execSync('npm run seed', {
      stdio: 'inherit',
      cwd: process.cwd(),
    });
    console.log('✅ Database seeded successfully');
  } catch (error) {
    // Exit code 1 means users exist, skip seeding
    if (error.status === 1) {
      console.log('✅ Database already has users, skipping seed');
    } else {
      throw error;
    }
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(path.join(process.cwd(), 'check-users.js'));
    } catch (e) {
      // Ignore cleanup errors
    }
  }
} catch (error) {
  console.error('⚠️  Seeding failed (non-critical):', error.message);
  // Don't exit - seeding failure shouldn't prevent app from starting
}

console.log('✅ Database setup complete');

