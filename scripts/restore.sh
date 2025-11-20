#!/bin/bash

# Restore script for Streamlined Transfers
# Restores database and/or uploads from backup

# Configuration
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${PROJECT_DIR}/backups"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Streamlined Transfers Restore Utility${NC}"
echo ""

# List available backups
echo "Available backups:"
echo ""

# Database backups
echo "Database backups:"
DB_BACKUPS=($(ls -t "${BACKUP_DIR}"/db_*.db.gz 2>/dev/null))
if [ ${#DB_BACKUPS[@]} -eq 0 ]; then
    echo "  No database backups found"
else
    for i in "${!DB_BACKUPS[@]}"; do
        FILE=$(basename "${DB_BACKUPS[$i]}")
        DATE=$(echo "$FILE" | sed 's/db_\(.*\)\.db\.gz/\1/')
        SIZE=$(du -h "${DB_BACKUPS[$i]}" | cut -f1)
        echo "  [$i] $FILE ($SIZE) - $DATE"
    done
fi

echo ""

# Upload backups
echo "Upload backups:"
UPLOAD_BACKUPS=($(ls -t "${BACKUP_DIR}"/uploads_*.tar.gz 2>/dev/null))
if [ ${#UPLOAD_BACKUPS[@]} -eq 0 ]; then
    echo "  No upload backups found"
else
    for i in "${!UPLOAD_BACKUPS[@]}"; do
        FILE=$(basename "${UPLOAD_BACKUPS[$i]}")
        DATE=$(echo "$FILE" | sed 's/uploads_\(.*\)\.tar\.gz/\1/')
        SIZE=$(du -h "${UPLOAD_BACKUPS[$i]}" | cut -f1)
        echo "  [$i] $FILE ($SIZE) - $DATE"
    done
fi

echo ""

# Prompt for restore
read -p "Restore database? (y/n): " RESTORE_DB
if [ "$RESTORE_DB" = "y" ] && [ ${#DB_BACKUPS[@]} -gt 0 ]; then
    read -p "Enter backup number: " DB_NUM
    if [ "$DB_NUM" -ge 0 ] && [ "$DB_NUM" -lt ${#DB_BACKUPS[@]} ]; then
        echo -e "${YELLOW}Restoring database...${NC}"
        echo -e "${RED}WARNING: This will overwrite the current database!${NC}"
        read -p "Are you sure? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            # Stop the app if running (optional - you may want to do this manually)
            # pm2 stop transfers 2>/dev/null || true
            
            # Restore database
            gunzip -c "${DB_BACKUPS[$DB_NUM]}" > "${PROJECT_DIR}/prisma/dev.db"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Database restored successfully${NC}"
            else
                echo -e "${RED}✗ Database restore failed${NC}"
            fi
        else
            echo "Restore cancelled"
        fi
    else
        echo -e "${RED}Invalid backup number${NC}"
    fi
fi

echo ""

read -p "Restore uploads? (y/n): " RESTORE_UPLOADS
if [ "$RESTORE_UPLOADS" = "y" ] && [ ${#UPLOAD_BACKUPS[@]} -gt 0 ]; then
    read -p "Enter backup number: " UPLOAD_NUM
    if [ "$UPLOAD_NUM" -ge 0 ] && [ "$UPLOAD_NUM" -lt ${#UPLOAD_BACKUPS[@]} ]; then
        echo -e "${YELLOW}Restoring uploads...${NC}"
        echo -e "${RED}WARNING: This will overwrite the current uploads folder!${NC}"
        read -p "Are you sure? (yes/no): " CONFIRM
        if [ "$CONFIRM" = "yes" ]; then
            # Backup current uploads first (safety)
            if [ -d "${PROJECT_DIR}/uploads" ]; then
                mv "${PROJECT_DIR}/uploads" "${PROJECT_DIR}/uploads_backup_$(date +%Y%m%d_%H%M%S)"
            fi
            
            # Restore uploads
            tar -xzf "${UPLOAD_BACKUPS[$UPLOAD_NUM]}" -C "${PROJECT_DIR}"
            if [ $? -eq 0 ]; then
                echo -e "${GREEN}✓ Uploads restored successfully${NC}"
            else
                echo -e "${RED}✗ Uploads restore failed${NC}"
            fi
        else
            echo "Restore cancelled"
        fi
    else
        echo -e "${RED}Invalid backup number${NC}"
    fi
fi

echo ""
echo -e "${GREEN}Restore complete!${NC}"

