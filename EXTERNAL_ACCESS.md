# External Access Setup Guide

This guide will help you make your application accessible from the internet (outside your local network).

## Option 1: ngrok (Quick & Easy - Recommended for Testing)

### Installation

**On Mac (using Homebrew):**
```bash
brew install ngrok/ngrok/ngrok
```

**On Mac/Linux (manual):**
1. Download from https://ngrok.com/download
2. Unzip and move to `/usr/local/bin/`:
   ```bash
   unzip ngrok.zip
   sudo mv ngrok /usr/local/bin/
   ```

**On Windows:**
1. Download from https://ngrok.com/download
2. Unzip to a folder (e.g., `C:\ngrok`)
3. Add to PATH or use full path

### Setup

1. **Sign up for a free ngrok account** (optional but recommended):
   - Go to https://dashboard.ngrok.com/signup
   - Get your authtoken from the dashboard

2. **Configure ngrok** (if you signed up):
   ```bash
   ngrok config add-authtoken YOUR_AUTH_TOKEN
   ```

3. **Start your application** (if not already running):
   ```bash
   npm run dev
   ```

4. **In a new terminal, start ngrok**:
   ```bash
   ngrok http 3000
   ```

5. **Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`) and share it with users.

**Note:** Free ngrok URLs change each time you restart. For a permanent URL, you need a paid plan or use Option 2.

### Using the Script

We've created a helper script. After installing ngrok, you can use:
```bash
./scripts/start-with-ngrok.sh
```

This will start both the Next.js server and ngrok together.

---

## Option 2: Cloudflare Tunnel (Free & Permanent URL)

Cloudflare Tunnel is free and gives you a permanent URL.

### Installation

1. **Download Cloudflare Tunnel**:
   ```bash
   # Mac/Linux
   curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64 -o cloudflared
   chmod +x cloudflared
   sudo mv cloudflared /usr/local/bin/
   ```

2. **Authenticate**:
   ```bash
   cloudflared tunnel login
   ```

3. **Create a tunnel**:
   ```bash
   cloudflared tunnel create streamlined-transfers
   ```

4. **Run the tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```

You'll get a permanent URL like `https://streamlined-transfers.trycloudflare.com`

---

## Option 3: Port Forwarding (Requires Router Access)

This makes your application directly accessible via your public IP.

### Steps

1. **Find your public IP**:
   - Visit https://whatismyipaddress.com
   - Note your IPv4 address

2. **Configure your router**:
   - Log into your router admin panel (usually `192.168.1.1` or `192.168.0.1`)
   - Go to "Port Forwarding" or "Virtual Server"
   - Forward external port 3000 to your computer's local IP on port 3000
   - Set protocol to TCP

3. **Configure firewall**:
   - Allow incoming connections on port 3000

4. **Access your app**:
   - Use `http://YOUR_PUBLIC_IP:3000`

**⚠️ Security Warning:** This exposes your application directly to the internet. Make sure:
- You have strong passwords for all users
- Consider using HTTPS (requires SSL certificate)
- Only expose if necessary

---

## Option 4: Production Deployment (Best for Long-term)

For a permanent, secure, and reliable solution, deploy to a cloud service:

- **Railway**: Easy deployment, free tier available
- **Render**: Free tier, automatic HTTPS
- **Vercel**: Optimized for Next.js, free tier
- **DigitalOcean**: More control, paid

See `DEPLOYMENT.md` for detailed instructions.

---

## Quick Start Script

After installing ngrok, you can use the provided script:

```bash
chmod +x scripts/start-with-ngrok.sh
./scripts/start-with-ngrok.sh
```

This will:
1. Start the Next.js dev server
2. Start ngrok tunnel
3. Display the public URL

