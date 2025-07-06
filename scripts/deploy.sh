#!/bin/bash

echo "🚀 Starting deployment script..."

# Generate Prisma Client
echo "📦 Generating Prisma Client..."
npx prisma generate

# Push database schema
echo "🗄️ Pushing database schema..."
npx prisma db push --skip-generate

# Run database seed (optional)
# echo "🌱 Seeding database..."
# npm run db:seed

echo "✅ Deployment preparation complete!"