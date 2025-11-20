#!/bin/bash

# Script to start Next.js dev server with ngrok tunnel for external access

echo "🚀 Starting Streamlined Transfers with external access..."
echo ""

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed!"
    echo ""
    echo "Please install ngrok first:"
    echo "  Mac: brew install ngrok/ngrok/ngrok"
    echo "  Or download from: https://ngrok.com/download"
    echo ""
    echo "See EXTERNAL_ACCESS.md for detailed instructions."
    exit 1
fi

# Check if port 3000 is already in use
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "⚠️  Port 3000 is already in use. Stopping existing processes..."
    pkill -f "next dev"
    sleep 2
fi

# Start Next.js dev server in background
echo "📦 Starting Next.js dev server..."
npm run dev > /tmp/nextjs-dev.log 2>&1 &
NEXTJS_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server started successfully
if ! kill -0 $NEXTJS_PID 2>/dev/null; then
    echo "❌ Failed to start Next.js server. Check /tmp/nextjs-dev.log for errors."
    exit 1
fi

echo "✅ Next.js server started (PID: $NEXTJS_PID)"
echo ""

# Start ngrok tunnel
echo "🌐 Starting ngrok tunnel..."
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Your application will be accessible at the URL below:"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Start ngrok and capture the URL
ngrok http 3000 &
NGROK_PID=$!

# Wait a moment for ngrok to start
sleep 3

# Try to get the ngrok URL from the API
NGROK_URL=$(curl -s http://localhost:4040/api/tunnels | grep -o '"public_url":"https://[^"]*' | head -1 | cut -d'"' -f4)

if [ -n "$NGROK_URL" ]; then
    echo "  🌍 Public URL: $NGROK_URL"
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    echo "✅ Setup complete! Share this URL with your users."
    echo ""
    echo "📝 Note: This URL will change if you restart ngrok."
    echo "   For a permanent URL, see EXTERNAL_ACCESS.md"
    echo ""
else
    echo "  ⚠️  Could not automatically detect ngrok URL."
    echo "  Check the ngrok web interface at: http://localhost:4040"
    echo ""
fi

echo "Press Ctrl+C to stop both servers..."
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $NEXTJS_PID 2>/dev/null
    kill $NGROK_PID 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    pkill -f ngrok 2>/dev/null
    echo "✅ Servers stopped."
    exit 0
}

# Trap Ctrl+C
trap cleanup INT TERM

# Wait for user to stop
wait

