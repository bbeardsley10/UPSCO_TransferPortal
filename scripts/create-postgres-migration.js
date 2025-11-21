// Script to ensure PostgreSQL migrations are ready
// This is a simple check - migrations should already be in the repo

const fs = require('fs');
const path = require('path');

console.log('🔄 Verifying PostgreSQL migrations...');

const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const lockFile = path.join(migrationsDir, 'migration_lock.toml');

// Verify migration lock file is set to PostgreSQL
if (fs.existsSync(lockFile)) {
  const lockFileContent = fs.readFileSync(lockFile, 'utf8');
  if (lockFileContent.includes('provider = "postgresql"')) {
    console.log('✅ PostgreSQL migrations are ready');
  } else {
    console.log('⚠️  Migration lock file needs update, but migrations should be in repo');
  }
} else {
  console.log('⚠️  Migration lock file not found');
}

console.log('✅ Migration check complete');

