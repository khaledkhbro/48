#!/bin/bash

# One-Click Database Setup Script
# This script sets up the entire microjob marketplace database

echo "🚀 Starting One-Click Database Setup..."
echo "======================================"

# Check if we're in the right directory
if [ ! -d "scripts" ]; then
    echo "❌ Error: scripts directory not found. Please run from project root."
    exit 1
fi

# Check for required environment variables
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "❌ Error: Missing required environment variables"
    echo "Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
    exit 1
fi

echo "✅ Environment variables found"
echo "📋 Running complete database setup..."

# Option 1: Run the JavaScript setup script
if command -v node &> /dev/null; then
    echo "🔄 Using Node.js setup script..."
    node scripts/run-complete-setup.js
else
    echo "⚠️  Node.js not found, falling back to direct SQL execution..."
    
    # Option 2: Run the master SQL script directly (if psql is available)
    if command -v psql &> /dev/null; then
        echo "🔄 Using PostgreSQL client..."
        psql "$POSTGRES_URL" -f scripts/complete-master-setup.sql
    else
        echo "❌ Neither Node.js nor psql found. Please install Node.js or PostgreSQL client."
        exit 1
    fi
fi

echo ""
echo "🎉 One-Click Setup Complete!"
echo "Your microjob marketplace database is ready to use."
