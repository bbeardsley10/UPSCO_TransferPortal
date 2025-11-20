# Self-Hosting Guide

You can absolutely host this on your own computer! Here are several options:

## Option 1: Simple Local Network Hosting (Easiest)

### For Windows:

1. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org)
   - Install the LTS version

2. **Run the application**:
   ```bash
   cd C:\path\to\StreamlinedTransfers
   npm install
   npm run build
   npm start
   ```

3. **Access from other computers on your network**:
   - Find your computer's IP address: Open Command Prompt, type `ipconfig`
   - Look for "IPv4 Address" (e.g., `192.168.1.100`)
   - Other computers can access at: `http://192.168.1.100:3000`

4. **Keep it running**:
   - Keep the terminal window open, OR
   - Use a tool like [PM2](https://pm2.keymetrics.io/) to run it in the background

### For Mac/Linux:

1. **Install Node.js** (if not already installed)
   ```bash
   # Mac (using Homebrew)
   brew install node
   
   # Or download from nodejs.org
   ```

2. **Run the application**:
   ```bash
   cd /path/to/StreamlinedTransfers
   npm install
   npm run build
   npm start
   ```

3. **Access from other computers**:
   - Find your IP: `ifconfig` or `ip addr`
   - Access at: `http://YOUR_IP:3000`

4. **Keep it running with PM2** (recommended):
   ```bash
   npm install -g pm2
   pm2 start npm --name "transfers" -- start
   pm2 save
   pm2 startup  # Follow instructions to auto-start on boot
   ```

---

## Option 2: Run as a Windows Service (Windows)

Use **NSSM** (Non-Sucking Service Manager):

1. **Download NSSM**: https://nssm.cc/download

2. **Install as service**:
   ```bash
   # Extract NSSM and open Command Prompt as Administrator
   nssm install StreamlinedTransfers
   ```
   
   In the GUI that opens:
   - **Path**: `C:\Program Files\nodejs\node.exe` (or your Node.js path)
   - **Startup directory**: `C:\path\to\StreamlinedTransfers`
   - **Arguments**: `start`
   - Click "Install service"

3. **Start the service**:
   ```bash
   nssm start StreamlinedTransfers
   ```

4. **Service will auto-start on boot**

---

## Option 3: Using Docker (Cross-platform)

1. **Create a `Dockerfile`**:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

2. **Create a `docker-compose.yml`**:
```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./prisma:/app/prisma
      - ./uploads:/app/uploads
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:./prisma/dev.db
    restart: unless-stopped
```

3. **Run with Docker**:
```bash
docker-compose up -d
```

---

## Option 4: Make it Accessible from Internet (Advanced)

### Using ngrok (Easiest, but temporary):

1. **Sign up at [ngrok.com](https://ngrok.com)** (free tier available)

2. **Install ngrok**:
   ```bash
   # Download from ngrok.com
   # Or: npm install -g ngrok
   ```

3. **Start your app**:
   ```bash
   npm start
   ```

4. **Create tunnel**:
   ```bash
   ngrok http 3000
   ```

5. **Use the provided URL** (e.g., `https://abc123.ngrok.io`)

**Note**: Free ngrok URLs change each time you restart. Paid plans give you a fixed URL.

### Using Port Forwarding (Permanent):

1. **Set up port forwarding on your router**:
   - Forward external port 80/443 → your computer's IP:3000
   - Use a service like [No-IP](https://www.noip.com/) for a domain name

2. **Security considerations**:
   - Use a reverse proxy (nginx) with HTTPS
   - Set up a firewall
   - Consider VPN access instead

---

## Recommended Setup for Production Use

### 1. Use PM2 (Process Manager)

**Install PM2**:
```bash
npm install -g pm2
```

**Start your app**:
```bash
cd /path/to/StreamlinedTransfers
npm run build
pm2 start npm --name "transfers" -- start
```

**Useful PM2 commands**:
```bash
pm2 list              # See running apps
pm2 logs transfers    # View logs
pm2 restart transfers # Restart app
pm2 stop transfers    # Stop app
pm2 save              # Save current process list
pm2 startup           # Auto-start on boot
```

### 2. Set Up Reverse Proxy with nginx (Optional but Recommended)

**Install nginx**:
```bash
# Mac
brew install nginx

# Linux (Ubuntu/Debian)
sudo apt install nginx

# Windows
# Download from nginx.org
```

**Configure nginx** (`/etc/nginx/sites-available/transfers`):
```nginx
server {
    listen 80;
    server_name your-domain.com;  # Or your IP

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable site**:
```bash
sudo ln -s /etc/nginx/sites-available/transfers /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl restart nginx
```

### 3. Set Up HTTPS with Let's Encrypt (For Internet Access)

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal is set up automatically
```

---

## Environment Setup

### Create a `.env` file:

```env
NODE_ENV=production
SESSION_SECRET=your-random-secret-here
DATABASE_URL=file:./prisma/dev.db
PORT=3000
```

**Generate SESSION_SECRET**:
```bash
# Mac/Linux
openssl rand -base64 32

# Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

---

## Security Considerations

1. **Firewall**: Only open necessary ports (3000, or 80/443 if using nginx)
2. **Keep software updated**: Regularly update Node.js and dependencies
3. **Use HTTPS**: Especially if accessing from internet
4. **Strong passwords**: For admin accounts
5. **Regular backups**: Backup your database and uploads folder

---

## Backup Strategy

### Automated Backup Script (Mac/Linux):

Create `backup.sh`:
```bash
#!/bin/bash
BACKUP_DIR="/path/to/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Backup database
cp prisma/dev.db "$BACKUP_DIR/db_$DATE.db"

# Backup uploads
tar -czf "$BACKUP_DIR/uploads_$DATE.tar.gz" uploads/

# Keep only last 30 days
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete
```

**Add to crontab** (daily backup at 2 AM):
```bash
crontab -e
# Add this line:
0 2 * * * /path/to/backup.sh
```

### Windows Task Scheduler:

1. Open Task Scheduler
2. Create Basic Task
3. Set trigger (daily at 2 AM)
4. Action: Start a program
5. Program: `cmd.exe`
6. Arguments: `/c "cd C:\path\to\StreamlinedTransfers && copy prisma\dev.db backups\db_%date%.db"`

---

## Troubleshooting

### App won't start:
- Check if port 3000 is already in use: `netstat -an | grep 3000`
- Check Node.js version: `node --version` (should be 18+)
- Check logs: `pm2 logs` or check terminal output

### Can't access from other computers:
- Check firewall settings
- Verify IP address is correct
- Ensure both computers are on same network
- Try accessing from the host computer first: `http://localhost:3000`

### App stops when terminal closes:
- Use PM2 or run as a service (see options above)

### Database issues:
- Ensure `prisma/dev.db` file exists
- Check file permissions
- Run migrations: `npx prisma migrate deploy`

---

## Quick Start Checklist

- [ ] Install Node.js
- [ ] Clone/download your code
- [ ] Run `npm install`
- [ ] Create `.env` file with `SESSION_SECRET`
- [ ] Run `npm run build`
- [ ] Start with `npm start` or `pm2 start`
- [ ] Test locally: `http://localhost:3000`
- [ ] Find your IP address
- [ ] Test from another device: `http://YOUR_IP:3000`
- [ ] Set up PM2 for auto-restart (optional)
- [ ] Set up backups (recommended)

---

## Cost

**Self-hosting is FREE!** You just need:
- A computer that can stay on
- Internet connection (for network access)
- Electricity (minimal for a small app)

**Optional costs**:
- Domain name: ~$10-15/year (if you want a custom domain)
- Dynamic DNS: Free (No-IP, DuckDNS) or ~$25/year
- SSL certificate: Free (Let's Encrypt)

---

## Recommendation

For internal company use with 5 locations:

1. **Use PM2** to keep it running
2. **Host on a dedicated computer** (or server if available)
3. **Access via local network** (no internet needed)
4. **Set up daily backups**
5. **Keep the computer on 24/7** or use Wake-on-LAN

This is the simplest and most cost-effective solution!

