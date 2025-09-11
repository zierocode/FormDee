# Deployment Notes for Ubuntu Server

## Known Warnings (Safe to Ignore)

### 1. ESLint 8.57.1 Deprecation

- **Warning**: `npm warn deprecated eslint@8.57.1`
- **Status**: Safe to ignore
- **Reason**: ESLint v9 requires completely different configuration format
- **Action**: Keep v8 until ready for major migration

### 2. node-domexception@1.0.0

- **Warning**: `npm warn deprecated node-domexception@1.0.0`
- **Status**: Cannot fix directly
- **Reason**: Transitive dependency from googleapis package
- **Action**: Will be fixed when Google updates their packages

## Ubuntu Server Deployment

### Quick Start

```bash
# On your Ubuntu server:
wget https://raw.githubusercontent.com/zierocode/FormDee/main/scripts/ubuntu-server-setup.sh
chmod +x ubuntu-server-setup.sh
./ubuntu-server-setup.sh
```

### Manual Deployment

```bash
cd ~/FormDee
./deploy.sh
```

### Monitoring

```bash
# Check application status
pm2 status

# View logs
pm2 logs formdee

# Monitor resources
htop

# Check memory
free -h
```

### Troubleshooting

#### Out of Memory Errors

1. Ensure swap is configured:

   ```bash
   sudo swapon --show
   ```

2. Increase Node.js memory:

   ```bash
   export NODE_OPTIONS="--max-old-space-size=4096"
   ```

3. Clear caches before build:
   ```bash
   rm -rf .next node_modules/.cache
   npm cache clean --force
   ```

#### Build Takes Too Long

- Use the optimized build script:
  ```bash
  ./scripts/optimize-build.sh
  ```

#### PM2 Issues

- Restart PM2:
  ```bash
  pm2 kill
  pm2 start ecosystem.config.js
  ```

## Performance Tips

1. **Use PM2 cluster mode** for multi-core servers:
   - Edit `ecosystem.config.js`
   - Change `instances: 1` to `instances: 'max'`

2. **Enable Nginx caching** for static assets

3. **Use CDN** for images and static files

4. **Monitor with PM2 Plus** (optional):
   ```bash
   pm2 plus
   ```

## Security Checklist

- [ ] SSL certificate configured (Let's Encrypt)
- [ ] Firewall enabled (ufw)
- [ ] Environment variables secured
- [ ] Admin keys changed from defaults
- [ ] Database connection secured
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`
