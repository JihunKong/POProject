#!/bin/bash

# Pure Ocean Platform - Setup Script Permissions
# Run this script to make all migration scripts executable

echo "Setting up script permissions for Pure Ocean RDS migration..."

# Make all scripts executable
# chmod +x scripts/export-railway-data.sh (removed - no longer needed)
chmod +x scripts/import-to-rds.sh
chmod +x scripts/update-ec2-environment.sh
chmod +x scripts/monitoring-setup.sh

echo "✓ All scripts are now executable"
echo ""
echo "Available scripts:"
# echo "  ./scripts/export-railway-data.sh    - Export data from Railway" (removed)
echo "  ./scripts/import-to-rds.sh          - Import data to AWS RDS"
echo "  ./scripts/update-ec2-environment.sh - Update EC2 environment variables"
echo "  ./scripts/monitoring-setup.sh       - Set up CloudWatch monitoring"
echo ""
echo "Next steps:"
echo "  1. Read DEPLOYMENT_GUIDE.md for detailed instructions"
echo "  2. Set up your environment variables"
echo "  3. Set up your database and import any existing data as needed"