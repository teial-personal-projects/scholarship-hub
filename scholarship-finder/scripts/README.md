# Scripts Directory

This directory contains various utility scripts organized by category for the scholarship scraper system.

## Purpose

The Scholarship Tracker is a comprehensive web application designed to help students manage their scholarship applications. The system allows students to:

- **Discover Scholarships**: Find relevant scholarship opportunities through automated web scraping
- **Manage Applications**: Track scholarship applications with status updates and deadlines
- **Organize Essays**: Manage and store scholarship essays and personal statements
- **Handle Recommendations**: Coordinate with recommenders and track recommendation letter submissions
- **Search and Filter**: Use advanced search capabilities to find scholarships matching their profile

## High-Level Features

### Scholarship Discovery
- Automated web scraping from multiple scholarship websites
- AI-powered search and data extraction
- Real-time scholarship data updates
- Comprehensive scholarship database with detailed information

### Application Management
- Create and track scholarship applications
- Status tracking (submitted, pending, accepted, rejected)
- Deadline management and notifications
- Application timeline and history

### Essay Management
- Store and organize scholarship essays (Future)
- Track essay requirements per scholarship

### Recommendation System
- Recommender profile management
- Recommendation request tracking
- Status monitoring for recommendation letters (Future)
- Automated reminder system (Future)

### User Experience
- Intuitive dashboard for application overview
- Advanced search and filtering capabilities
- Secure authentication with Auth0
- Responsive design for all devices
- Push notifications for new matching scholarships (Future)

## Directory Structure

### `python/` - Python Scraper Scripts
Contains Python-specific setup, configuration, and deployment scripts.

**Key Scripts:**
- Environment setup and configuration (`setup.sh`)
- Database schema management (`setup_local_db.sql`)
- Scraper configuration (`configure_scrapers.py`)
- RDS configuration helper (`configure_rds.py`)
- Environment testing (`test_environment_switch.py`)

See [python/README.md](python/README.md) for detailed documentation.

## General Scripts (Root Level)

### Database Scripts
- **`mysql-migration.sql`** - MySQL migration SQL for database setup
- **`recreate-websites-table.sql`** - Recreate websites table with proper schema

### Data Management
- **`run-populate-websites.sh`** - Populate websites table with initial configurations

### Development
- **`test-system.sh`** - Test system functionality
- **`update-shared-types.sh`** - Update shared TypeScript types across the project

## Usage

### Python Scraper Setup
```bash
cd scripts/python
./setup.sh
python configure_scrapers.py --show
```

### Database Operations
```bash
cd scripts
# Run MySQL migration
mysql -u username -p database_name < mysql-migration.sql

# Recreate websites table
mysql -u username -p database_name < recreate-websites-table.sql

# Populate websites table
./run-populate-websites.sh
```

### Development Operations
```bash
cd scripts
# Test system functionality
./test-system.sh

# Update shared types across the project
./update-shared-types.sh
```

## Prerequisites

- **For Python scripts:** Python 3.13+, MySQL (local or RDS), virtual environment
- **For database scripts:** MySQL client, appropriate database permissions
- **For development scripts:** Node.js, npm dependencies installed
- **For RDS operations:** AWS CLI configured (if using RDS MySQL)
