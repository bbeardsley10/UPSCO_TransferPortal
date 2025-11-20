// Script to create PostgreSQL migration on first deploy
// This handles the SQLite to PostgreSQL migration switch

const fs = require('fs');
const path = require('path');

console.log('🔄 Setting up PostgreSQL migrations...');

const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
const lockFile = path.join(migrationsDir, 'migration_lock.toml');

// Check if we need to reset migrations
const lockFileContent = fs.existsSync(lockFile) 
  ? fs.readFileSync(lockFile, 'utf8') 
  : '';

if (lockFileContent.includes('provider = "sqlite"')) {
  console.log('⚠️  Detected SQLite migrations, updating for PostgreSQL...');
  
  // Simply update the migration_lock.toml file
  fs.writeFileSync(lockFile, 'provider = "postgresql"\n');
  console.log('✅ Updated migration lock file to PostgreSQL');
  
  // Delete all old SQLite migration directories
  if (fs.existsSync(migrationsDir)) {
    const files = fs.readdirSync(migrationsDir);
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const stat = fs.statSync(filePath);
      if (stat.isDirectory() && file.match(/^\d{14}_/)) {
        // Delete old migration directories
        fs.rmSync(filePath, { recursive: true, force: true });
        console.log(`🗑️  Removed old migration: ${file}`);
      }
    }
  }
  
  // Create initial migration SQL from schema
  const initMigrationDir = path.join(migrationsDir, '20250101000000_init_postgresql');
  if (!fs.existsSync(initMigrationDir)) {
    fs.mkdirSync(initMigrationDir, { recursive: true });
    
    // Create migration SQL
    const migrationSQL = `-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transfer" (
    "id" SERIAL NOT NULL,
    "fromUserId" INTEGER NOT NULL,
    "toUserId" INTEGER NOT NULL,
    "pdfFileName" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "transferType" TEXT NOT NULL DEFAULT 'send',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "statusUpdatedAt" TIMESTAMP(3),
    "notes" TEXT,
    "receivedAtDestination" BOOLEAN NOT NULL DEFAULT false,
    "receivedAtDestinationAt" TIMESTAMP(3),
    "enteredIntoSystem" BOOLEAN NOT NULL DEFAULT false,
    "enteredIntoSystemAt" TIMESTAMP(3),
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "viewedByRecipient" BOOLEAN NOT NULL DEFAULT false,
    "viewedByRecipientAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_fromUserId_fkey" FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transfer" ADD CONSTRAINT "Transfer_toUserId_fkey" FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
`;
    
    fs.writeFileSync(path.join(initMigrationDir, 'migration.sql'), migrationSQL);
    console.log('✅ Created initial PostgreSQL migration');
  }
} else {
  console.log('✅ PostgreSQL migrations already set up');
}

console.log('✅ Migration setup complete');

