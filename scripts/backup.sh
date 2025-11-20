#!/bin/bash

# Backup script for Streamlined Transfers
# Backs up database and uploads folder

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30  # Keep backups for 30 days

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting backup...${NC}"

# Create backup directory if it doesn't exist
mkdir -p "${BACKUP_DIR}"

# Backup database
if [ -f "${PROJECT_DIR}/prisma/dev.db" ]; then
    echo "Backing up database..."
    cp "${PROJECT_DIR}/prisma/dev.db" "${BACKUP_DIR}/db_${DATE}.db"
    
    # Compress the database backup
    gzip "${BACKUP_DIR}/db_${DATE}.db"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Database backed up: db_${DATE}.db.gz${NC}"
    else
        echo -e "${RED}✗ Database backup failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Database file not found${NC}"
fi

# Backup uploads folder
if [ -d "${PROJECT_DIR}/uploads" ]; then
    echo "Backing up uploads folder..."
    tar -czf "${BACKUP_DIR}/uploads_${DATE}.tar.gz" -C "${PROJECT_DIR}" uploads/
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Uploads backed up: uploads_${DATE}.tar.gz${NC}"
        
        # Show size of backup
        SIZE=$(du -h "${BACKUP_DIR}/uploads_${DATE}.tar.gz" | cut -f1)
        echo "  Size: ${SIZE}"
    else
        echo -e "${RED}✗ Uploads backup failed${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}⚠ Uploads folder not found${NC}"
fi

# Clean up old backups (keep only last 30 days)
echo "Cleaning up old backups (older than ${RETENTION_DAYS} days)..."
find "${BACKUP_DIR}" -name "db_*.db.gz" -mtime +${RETENTION_DAYS} -delete
find "${BACKUP_DIR}" -name "uploads_*.tar.gz" -mtime +${RETENTION_DAYS} -delete

# Count remaining backups
DB_COUNT=$(find "${BACKUP_DIR}" -name "db_*.db.gz" | wc -l | tr -d ' ')
UPLOADS_COUNT=$(find "${BACKUP_DIR}" -name "uploads_*.tar.gz" | wc -l | tr -d ' ')

echo -e "${GREEN}Backup complete!${NC}"
echo "  Database backups: ${DB_COUNT}"
echo "  Upload backups: ${UPLOADS_COUNT}"
echo "  Backup location: ${BACKUP_DIR}"

# Optional: Show disk usage
TOTAL_SIZE=$(du -sh "${BACKUP_DIR}" | cut -f1)
echo "  Total backup size: ${TOTAL_SIZE}"

