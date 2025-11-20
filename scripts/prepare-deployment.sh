#!/bin/sh

# Script to prepare the application for deployment
# This helps switch between SQLite (local) and PostgreSQL (production)

echo "🚀 Preparing Streamlined Transfers for Deployment"
echo ""

# Backup current schema
if [ -f "prisma/schema.prisma" ]; then
    cp prisma/schema.prisma prisma/schema.backup.prisma
fi

# Check if DATABASE_URL is set and contains postgresql (using sh-compatible syntax)
if [ -n "$DATABASE_URL" ] && (echo "$DATABASE_URL" | grep -q "postgresql\|postgres"); then
    echo "📦 Detected PostgreSQL database - using production schema"
    cp prisma/schema.production.prisma prisma/schema.prisma
    echo "✅ Schema updated for PostgreSQL"
    echo "   Generating Prisma client..."
    npx prisma generate
else
    echo "💾 Using SQLite for local development"
    echo "   (Schema is already configured for SQLite)"
    # Restore backup if it exists
    if [ -f "prisma/schema.backup.prisma" ]; then
        # Check if backup is different from current
        if ! cmp -s prisma/schema.prisma prisma/schema.backup.prisma; then
            cp prisma/schema.backup.prisma prisma/schema.prisma
        fi
        rm prisma/schema.backup.prisma
    fi
fi

echo ""
echo "✅ Preparation complete!"
echo ""

