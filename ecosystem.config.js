module.exports = {
  apps: [{
    name: 'pure-ocean-app',
    script: 'server.js',
    instances: 1,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0'
    },
    // Restart configuration
    max_restarts: 10,
    min_uptime: '10s',
    max_memory_restart: '500M',
    
    // Logging
    log_file: '/tmp/pure-ocean.log',
    error_file: '/tmp/pure-ocean-error.log',
    out_file: '/tmp/pure-ocean-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Health monitoring
    watch: false,
    ignore_watch: ['node_modules', '.next', '.git'],
    
    // Graceful shutdown
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};