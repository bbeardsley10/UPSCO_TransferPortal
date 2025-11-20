#!/bin/bash

# Setup script for automatic backups
# This will add a cron job to run backups daily at 2 AM

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_SCRIPT="${PROJECT_DIR}/scripts/backup.sh"
CRON_JOB="0 2 * * * cd ${PROJECT_DIR} && ${BACKUP_SCRIPT} >> ${PROJECT_DIR}/backups/backup.log 2>&1"

echo "Setting up automatic backups..."
echo ""

# Check if backup script exists
if [ ! -f "$BACKUP_SCRIPT" ]; then
    echo "Error: Backup script not found at $BACKUP_SCRIPT"
    exit 1
fi

# Make sure backup script is executable
chmod +x "$BACKUP_SCRIPT"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup.sh"; then
    echo "⚠ Automatic backup is already set up!"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep backup.sh
    echo ""
    read -p "Do you want to update it? (y/n): " UPDATE
    if [ "$UPDATE" != "y" ]; then
        echo "Keeping existing backup schedule."
        exit 0
    fi
    # Remove old backup cron job
    crontab -l 2>/dev/null | grep -v "backup.sh" | crontab -
fi

# Add new cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

if [ $? -eq 0 ]; then
    echo "✓ Automatic backup scheduled successfully!"
    echo ""
    echo "Backup will run daily at 2:00 AM"
    echo "Backups will be stored in: ${PROJECT_DIR}/backups"
    echo ""
    echo "To view scheduled backups:"
    echo "  crontab -l"
    echo ""
    echo "To remove automatic backups:"
    echo "  crontab -l | grep -v backup.sh | crontab -"
    echo ""
    echo "To test backup now:"
    echo "  ${BACKUP_SCRIPT}"
else
    echo "✗ Failed to set up automatic backup"
    exit 1
fi

