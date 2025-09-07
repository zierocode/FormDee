#!/usr/bin/env node

/**
 * 🐳 FormDee - Docker Management Script
 * 
 * Quick commands for managing FormDee Docker containers:
 * - npm run docker:logs    - View container logs
 * - npm run docker:stop    - Stop container
 * - npm run docker:start   - Start container
 * - npm run docker:restart - Restart container
 * - npm run docker:status  - Container status
 * - npm run docker:clean   - Remove container and image
 */

const { exec } = require('child_process');

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const colorize = (text, color) => `${colors[color]}${text}${colors.reset}`;

function execCommand(command) {
  return new Promise((resolve, reject) => {
    console.log(colorize(`🔧 ${command}`, 'blue'));
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(colorize(`❌ ${error.message}`, 'red'));
        reject(error);
        return;
      }
      if (stderr) {
        console.warn(colorize(`⚠️  ${stderr}`, 'yellow'));
      }
      if (stdout) {
        console.log(stdout);
      }
      resolve({ stdout, stderr });
    });
  });
}

async function main() {
  const command = process.argv[2];
  const containerName = 'formDee';

  try {
    switch (command) {
      case 'logs':
        console.log(colorize(`📋 Viewing logs for ${containerName}:`, 'cyan'));
        await execCommand(`docker logs -f ${containerName}`);
        break;

      case 'stop':
        console.log(colorize(`🛑 Stopping ${containerName}...`, 'yellow'));
        await execCommand(`docker stop ${containerName}`);
        console.log(colorize(`✅ Container stopped`, 'green'));
        break;

      case 'start':
        console.log(colorize(`🚀 Starting ${containerName}...`, 'green'));
        await execCommand(`docker start ${containerName}`);
        console.log(colorize(`✅ Container started`, 'green'));
        break;

      case 'restart':
        console.log(colorize(`🔄 Restarting ${containerName}...`, 'yellow'));
        await execCommand(`docker restart ${containerName}`);
        console.log(colorize(`✅ Container restarted`, 'green'));
        break;

      case 'status':
        console.log(colorize(`📊 Container status:`, 'cyan'));
        await execCommand(`docker ps -a --filter name=${containerName}`);
        console.log(colorize(`\n📈 Resource usage:`, 'cyan'));
        await execCommand(`docker stats ${containerName} --no-stream`);
        break;

      case 'clean':
        console.log(colorize(`🧹 Cleaning up ${containerName}...`, 'red'));
        await execCommand(`docker stop ${containerName} || true`);
        await execCommand(`docker rm ${containerName} || true`);
        await execCommand(`docker rmi formdee:latest || true`);
        console.log(colorize(`✅ Cleanup completed`, 'green'));
        break;

      default:
        console.log(colorize('🐳 FormDee Docker Management', 'cyan'));
        console.log('\nAvailable commands:');
        console.log(colorize('  npm run docker:logs', 'green'), '   - View container logs');
        console.log(colorize('  npm run docker:stop', 'yellow'), '   - Stop container');
        console.log(colorize('  npm run docker:start', 'green'), '  - Start container');
        console.log(colorize('  npm run docker:restart', 'blue'), '- Restart container');
        console.log(colorize('  npm run docker:status', 'cyan'), ' - Container status');
        console.log(colorize('  npm run docker:clean', 'red'), '  - Remove container and image');
        console.log('\nExample: npm run docker:logs');
        break;
    }
  } catch (error) {
    console.error(colorize('❌ Command failed:', 'red'), error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}