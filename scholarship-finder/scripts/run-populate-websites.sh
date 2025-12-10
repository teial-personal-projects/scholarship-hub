#!/bin/bash

# Script to populate the scholarship-websites MySQL table
# This script can be run multiple times safely

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default environment
ENVIRONMENT=${ENVIRONMENT:-dev}

echo -e "${GREEN}🚀 Starting website table population for environment: ${ENVIRONMENT}${NC}"

# Check if MySQL is installed
if ! command -v mysql &> /dev/null; then
    echo -e "${RED}❌ MySQL is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if ts-node is installed
if ! command -v ts-node &> /dev/null; then
    echo -e "${YELLOW}⚠️  ts-node is not installed. Installing it globally...${NC}"
    npm install -g ts-node
fi

# Check if the table exists
echo -e "${YELLOW}🔍 Checking if websites table exists...${NC}"

if ! mysql -u root -e "USE scholarships; DESCRIBE websites;" &> /dev/null; then
    echo -e "${RED}❌ Table websites does not exist. Please run the database setup script first.${NC}"
    echo -e "${YELLOW}💡 Run: mysql -u root < scripts/python/setup_local_db.sql${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Table websites exists${NC}"

# Set environment variable for the script
export ENVIRONMENT=$ENVIRONMENT

# Run the TypeScript population script
echo -e "${YELLOW}📝 Running website table population script...${NC}"

# Change to the project root directory
cd "$(dirname "$0")/.."

# Run the Python script
python3 scripts/python/populate_websites.py

echo -e "${GREEN}✅ Website table population completed successfully!${NC}"

# Verify the data was inserted
echo -e "${YELLOW}🔍 Verifying data...${NC}"
mysql -u root -e "USE scholarships; SELECT COUNT(*) as count FROM websites;"

echo -e "${GREEN}🎉 All done! The websites table has been populated.${NC}"
echo -e "${YELLOW}💡 You can now run the scraper jobs.${NC}" 