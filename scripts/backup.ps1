# Backup script for Streamlined Transfers (Windows PowerShell)
# Backs up database and uploads folder

# Configuration
$ProjectDir = Split-Path -Parent $PSScriptRoot
$BackupDir = Join-Path $ProjectDir "backups"
$Date = Get-Date -Format "yyyyMMdd_HHmmss"
$RetentionDays = 30  # Keep backups for 30 days

# Create backup directory if it doesn't exist
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
}

Write-Host "Starting backup..." -ForegroundColor Green

# Backup database
$DbPath = Join-Path $ProjectDir "prisma\dev.db"
if (Test-Path $DbPath) {
    Write-Host "Backing up database..."
    $DbBackup = Join-Path $BackupDir "db_$Date.db"
    Copy-Item $DbPath $DbBackup
    
    # Compress the database backup
    $DbBackupZip = "$DbBackup.gz"
    # Note: PowerShell doesn't have built-in gzip, so we'll use .zip instead
    Compress-Archive -Path $DbBackup -DestinationPath "$DbBackup.zip" -Force
    Remove-Item $DbBackup
    
    if (Test-Path "$DbBackup.zip") {
        Write-Host "✓ Database backed up: db_$Date.db.zip" -ForegroundColor Green
    } else {
        Write-Host "✗ Database backup failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠ Database file not found" -ForegroundColor Yellow
}

# Backup uploads folder
$UploadsPath = Join-Path $ProjectDir "uploads"
if (Test-Path $UploadsPath) {
    Write-Host "Backing up uploads folder..."
    $UploadsBackup = Join-Path $BackupDir "uploads_$Date.zip"
    Compress-Archive -Path $UploadsPath -DestinationPath $UploadsBackup -Force
    
    if (Test-Path $UploadsBackup) {
        Write-Host "✓ Uploads backed up: uploads_$Date.zip" -ForegroundColor Green
        
        # Show size of backup
        $Size = (Get-Item $UploadsBackup).Length / 1MB
        Write-Host "  Size: $([math]::Round($Size, 2)) MB"
    } else {
        Write-Host "✗ Uploads backup failed" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "⚠ Uploads folder not found" -ForegroundColor Yellow
}

# Clean up old backups (keep only last 30 days)
Write-Host "Cleaning up old backups (older than $RetentionDays days)..."
$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
Get-ChildItem $BackupDir -Filter "db_*.db.zip" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item
Get-ChildItem $BackupDir -Filter "uploads_*.zip" | Where-Object { $_.LastWriteTime -lt $CutoffDate } | Remove-Item

# Count remaining backups
$DbCount = (Get-ChildItem $BackupDir -Filter "db_*.db.zip").Count
$UploadsCount = (Get-ChildItem $BackupDir -Filter "uploads_*.zip").Count

Write-Host "Backup complete!" -ForegroundColor Green
Write-Host "  Database backups: $DbCount"
Write-Host "  Upload backups: $UploadsCount"
Write-Host "  Backup location: $BackupDir"

# Show disk usage
$TotalSize = (Get-ChildItem $BackupDir | Measure-Object -Property Length -Sum).Sum / 1MB
Write-Host "  Total backup size: $([math]::Round($TotalSize, 2)) MB"

