const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

function databaseSwitcher() {
  console.log('🔄 Database Environment Switcher\n')

  const args = process.argv.slice(2)
  const command = args[0]

  if (!command) {
    console.log('Usage:')
    console.log('  node db-switcher.js backup    # Create backup and switch to development')
    console.log('  node db-switcher.js restore   # Restore from backup')
    console.log('  node db-switcher.js dev       # Set up fresh development database')
    console.log('  node db-switcher.js status    # Show current database status')
    return
  }

  try {
    switch (command) {
      case 'backup':
        console.log('📦 Creating backup and switching to development...')
        execSync('node backup-database.js', { stdio: 'inherit' })
        execSync('node setup-development-db.js', { stdio: 'inherit' })
        console.log('\n✅ Switched to development database!')
        break

      case 'restore':
        console.log('🔄 Restoring from backup...')
        if (!fs.existsSync('./database-backup')) {
          console.log('❌ No backup directory found!')
          return
        }

        const backupDirs = fs.readdirSync('./database-backup')
          .filter(name => name.startsWith('backup-'))
          .sort()
          .reverse()

        if (backupDirs.length === 0) {
          console.log('❌ No backups found!')
          return
        }

        const latestBackup = backupDirs[0]
        console.log(`📂 Using latest backup: ${latestBackup}`)
        
        execSync(`cd ./database-backup/${latestBackup} && node restore.js`, { stdio: 'inherit' })
        console.log('\n✅ Database restored from backup!')
        break

      case 'dev':
        console.log('🚀 Setting up fresh development database...')
        execSync('node setup-development-db.js', { stdio: 'inherit' })
        console.log('\n✅ Development database ready!')
        break

      case 'status':
        console.log('📊 Database Status Check...')
        execSync('node test-database-connection.js', { stdio: 'inherit' })
        break

      default:
        console.log(`❌ Unknown command: ${command}`)
        console.log('Run without arguments to see usage.')
    }
  } catch (error) {
    console.error('❌ Operation failed:', error.message)
  }
}

databaseSwitcher()
