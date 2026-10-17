#!/usr/bin/env bash
#
# Atrina BaaS — Production Deployment Script
#
# Run this on a fresh server to deploy Atrina BaaS with PostgreSQL.
# Tested on Ubuntu 22.04 LTS. Adjust for your distro.
#
# Usage:
#   sudo ./scripts/deploy.sh
#
set -euo pipefail

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Atrina BaaS — Production Deployment ===${NC}"
echo ""

# Pre-flight checks
echo -e "${YELLOW}[1/8] Pre-flight checks...${NC}"

if [[ $EUID -ne 0 ]]; then
  echo -e "${RED}This script must be run as root${NC}"
  exit 1
fi

if [[ ! -f /home/z/my-project/package.json ]]; then
  echo -e "${RED}package.json not found. Run from project root.${NC}"
  exit 1
fi

# Check for required commands
for cmd in bun docker psql; do
  if ! command -v $cmd &> /dev/null; then
    echo -e "${YELLOW}  $cmd not found. Installing...${NC}"
    case $cmd in
      bun) curl -fsSL https://bun.sh/install | bash ;;
      docker) curl -fsSL https://get.docker.com | sh ;;
      psql) apt-get update && apt-get install -y postgresql-client ;;
    esac
  fi
done

echo -e "${GREEN}  ✓ All commands available${NC}"

# 2. Environment
echo ""
echo -e "${YELLOW}[2/8] Setting up environment...${NC}"

if [[ ! -f /home/z/my-project/.env ]]; then
  cp /home/z/my-project/.env.example /home/z/my-project/.env
  echo -e "${YELLOW}  Created .env from .env.example${NC}"
  echo -e "${YELLOW}  ⚠️  Edit /home/z/my-project/.env with real values before proceeding!${NC}"
  echo -e "${YELLOW}  Especially: DATABASE_URL, SESSION_SECRET, APP_ENCRYPTION_KEY${NC}"
  read -p "  Press Enter once you've edited .env... "
else
  echo -e "${GREEN}  ✓ .env exists${NC}"
fi

# Validate critical env vars
source /home/z/my-project/.env
for var in DATABASE_URL SESSION_SECRET APP_ENCRYPTION_KEY; do
  val="${!var:-}"
  if [[ -z "$val" || "$val" == *"change_me"* ]]; then
    echo -e "${RED}  $var is not set or has placeholder value. Edit .env first.${NC}"
    exit 1
  fi
done
echo -e "${GREEN}  ✓ All critical env vars set${NC}"

# 3. Database connection
echo ""
echo -e "${YELLOW}[3/8] Testing database connection...${NC}"
if psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
  echo -e "${GREEN}  ✓ Database reachable${NC}"
else
  echo -e "${RED}  Cannot connect to database. Check DATABASE_URL in .env${NC}"
  exit 1
fi

# 4. Install dependencies
echo ""
echo -e "${YELLOW}[4/8] Installing dependencies...${NC}"
cd /home/z/my-project
bun install --frozen-lockfile --production
echo -e "${GREEN}  ✓ Dependencies installed${NC}"

# 5. Build
echo ""
echo -e "${YELLOW}[5/8] Building production bundle...${NC}"
bun run build
echo -e "${GREEN}  ✓ Built${NC}"

# 6. Database migrations
echo ""
echo -e "${YELLOW}[6/8] Pushing schema to database...${NC}"
bun run db:push
echo -e "${GREEN}  ✓ Schema in sync${NC}"

# 7. (Optional) Seed admin user
echo ""
echo -e "${YELLOW}[7/8] (Optional) Seed admin user...${NC}"
read -p "  Seed demo data? (y/N) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  bun run scripts/seed.ts
  echo -e "${GREEN}  ✓ Seeded${NC}"
else
  echo -e "${YELLOW}  Skipped (run 'bun run scripts/seed.ts' later if needed)${NC}"
fi

# 8. Systemd service
echo ""
echo -e "${YELLOW}[8/8] Setting up systemd service...${NC}"
cat > /etc/systemd/system/atrina-baas.service << EOF
[Unit]
Description=Atrina BaaS
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/home/z/my-project
ExecStart=/root/.bun/bin/bun run start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable atrina-baas
systemctl restart atrina-baas
sleep 3

if systemctl is-active --quiet atrina-baas; then
  echo -e "${GREEN}  ✓ atrina-baas service running${NC}"
else
  echo -e "${RED}  Service failed to start. Check: journalctl -u atrina-baas -f${NC}"
  exit 1
fi

# Final verification
echo ""
echo -e "${GREEN}=== Deployment Complete ===${NC}"
echo ""
echo -e "${YELLOW}Verify:${NC}"
echo "  curl http://localhost:3000/api/health?check=live"
echo "  curl http://localhost:3000/api/health?check=ready"
echo ""
echo -e "${YELLOW}Default admin (if you seeded):${NC}"
echo "  Email:    demo@atrina.io"
echo "  Password: atrina123"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Set up reverse proxy (Caddy/Nginx) with TLS"
echo "  2. Configure daily backups (cron + pg_dump)"
echo "  3. Set up monitoring (logs → aggregator, health check → uptime monitor)"
echo "  4. Replace mock billing/storage/notification providers with real ones"
echo ""
echo -e "${GREEN}Done!${NC}"
