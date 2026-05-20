const { execSync } = require('child_process');
try {
  execSync('git checkout prisma/schema.prisma', { stdio: 'inherit' });
  console.log('Restored successfully.');
} catch (e) {
  console.error('Failed:', e);
}
