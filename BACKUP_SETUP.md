# Automated Backup Setup Guide

This guide will help you set up automated backups for your Streamlined Transfers application.

## What Gets Backed Up

- **Database** (`prisma/dev.db`) - All transfer records, users, and data
- **Uploads folder** (`uploads/`) - All PDF files

## Quick Setup

### Mac/Linux

1. **Test the backup script**:
   ```bash
   cd /path/to/StreamlinedTransfers
   ./scripts/backup.sh
   ```

2. **Set up automatic daily backups** (runs at 2 AM):
   ```bash
   crontab -e
   ```
   
   Add this line:
   ```cron
   0 2 * * * /path/to/StreamlinedTransfers/scripts/backup.sh >> /path/to/StreamlinedTransfers/backups/backup.log 2>&1
   ```

3. **Verify it's set up**:
   ```bash
   crontab -l
   ```

### Windows

1. **Test the backup script**:
   - Open PowerShell as Administrator
   - Navigate to your project: `cd C:\path\to\StreamlinedTransfers`
   - Run: `.\scripts\backup.ps1`

2. **Set up Task Scheduler**:
   - Open Task Scheduler (search for it in Start menu)
   - Click "Create Basic Task"
   - Name: "Streamlined Transfers Backup"
   - Trigger: Daily at 2:00 AM
   - Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "C:\path\to\StreamlinedTransfers\scripts\backup.ps1"`
   - Finish

## Backup Schedule Options

### Daily at 2 AM (Recommended)
```cron
0 2 * * * /path/to/StreamlinedTransfers/scripts/backup.sh
```

### Every 6 Hours
```cron
0 */6 * * * /path/to/StreamlinedTransfers/scripts/backup.sh
```

### Twice Daily (2 AM and 2 PM)
```cron
0 2,14 * * * /path/to/StreamlinedTransfers/scripts/backup.sh
```

### Weekly (Every Sunday at 2 AM)
```cron
0 2 * * 0 /path/to/StreamlinedTransfers/scripts/backup.sh
```

## Backup Retention

By default, backups are kept for **30 days**. Older backups are automatically deleted.

To change this, edit the `RETENTION_DAYS` variable in the backup script:
- `backup.sh` (Mac/Linux): Line 9
- `backup.ps1` (Windows): Line 6

## Backup Location

Backups are stored in: `StreamlinedTransfers/backups/`

Structure:
```
backups/
  ├── db_20240115_020000.db.gz
  ├── db_20240116_020000.db.gz
  ├── uploads_20240115_020000.tar.gz
  └── uploads_20240116_020000.tar.gz
```

## Restoring from Backup

### Mac/Linux

Run the restore script:
```bash
./scripts/restore.sh
```

Follow the prompts to select which backup to restore.

### Windows

1. Navigate to the `backups` folder
2. Find the backup you want to restore
3. **For database**: Extract the `.db.zip` file and copy `dev.db` to `prisma/dev.db`
4. **For uploads**: Extract the `uploads_*.zip` file to restore the uploads folder

## Manual Backup

You can also run backups manually anytime:

**Mac/Linux**:
```bash
./scripts/backup.sh
```

**Windows**:
```powershell
.\scripts\backup.ps1
```

## Monitoring Backups

### Check Backup Logs

**Mac/Linux** (if you added logging to crontab):
```bash
tail -f backups/backup.log
```

**Windows**:
- Check Task Scheduler → Task History
- Or add logging to the PowerShell script

### Verify Backups Are Running

**Mac/Linux**:
```bash
# Check if cron job is running
ps aux | grep backup.sh

# List recent backups
ls -lht backups/ | head -10
```

**Windows**:
- Open Task Scheduler
- Check "Task Scheduler Library" for your backup task
- View "History" tab to see if it's running

## Backup Size Management

### Check Backup Size
```bash
# Mac/Linux
du -sh backups/

# Windows (PowerShell)
Get-ChildItem backups | Measure-Object -Property Length -Sum
```

### Clean Up Old Backups Manually
```bash
# Mac/Linux - Remove backups older than 7 days
find backups/ -name "*.gz" -mtime +7 -delete

# Windows (PowerShell) - Remove backups older than 7 days
Get-ChildItem backups\*.zip | Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-7) } | Remove-Item
```

## Off-Site Backup (Recommended)

For extra safety, copy backups to another location:

### Option 1: External Drive
```bash
# Mac/Linux - Copy to external drive
rsync -av backups/ /Volumes/ExternalDrive/transfers_backups/

# Windows - Use File Explorer or:
robocopy backups\ E:\transfers_backups\ /MIR
```

### Option 2: Cloud Storage
```bash
# Using rclone (install from rclone.org)
rclone copy backups/ remote:transfers_backups/

# Or use Dropbox/OneDrive sync folder
# Just move backups folder to your synced location
```

### Option 3: Network Share
```bash
# Mac/Linux
rsync -av backups/ user@server:/backups/transfers/

# Windows
net use Z: \\server\backups
xcopy backups\ Z:\transfers\ /E /I /Y
```

## Troubleshooting

### Backup Script Not Running

**Mac/Linux**:
- Check cron is running: `sudo service cron status`
- Check cron logs: `grep CRON /var/log/syslog`
- Verify script is executable: `chmod +x scripts/backup.sh`
- Test manually: `./scripts/backup.sh`

**Windows**:
- Check Task Scheduler → Task History
- Verify PowerShell execution policy: `Get-ExecutionPolicy`
- If restricted, run: `Set-ExecutionPolicy RemoteSigned -Scope CurrentUser`

### Permission Errors

**Mac/Linux**:
```bash
# Make scripts executable
chmod +x scripts/*.sh

# Ensure backup directory is writable
chmod 755 backups/
```

**Windows**:
- Run PowerShell as Administrator
- Or adjust folder permissions in Properties → Security

### Out of Disk Space

1. Check available space: `df -h` (Mac/Linux) or check in File Explorer (Windows)
2. Reduce retention days in backup script
3. Clean up old backups manually
4. Move backups to external storage

## Best Practices

1. **Test your backups regularly** - Restore to a test location to verify they work
2. **Keep off-site backups** - Don't rely on just local backups
3. **Monitor backup size** - Ensure you have enough disk space
4. **Document your restore process** - Know how to restore before you need to
5. **Test disaster recovery** - Practice restoring from backup

## Emergency Restore

If you need to restore immediately:

1. **Stop the application**:
   ```bash
   # If using PM2
   pm2 stop transfers
   ```

2. **Run restore script** (Mac/Linux):
   ```bash
   ./scripts/restore.sh
   ```

3. **Or manually restore**:
   - Copy backup database to `prisma/dev.db`
   - Extract uploads backup to `uploads/` folder

4. **Restart the application**:
   ```bash
   pm2 start transfers
   ```

## Questions?

- Check backup logs for errors
- Verify backups exist in the `backups/` folder
- Test manual backup to see if it works
- Check disk space availability

