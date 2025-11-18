module.exports = {
  apps: [{
    name: 'pure-ocean-app',
    script: 'server.js',
    instances: 1, // 복구용으로 1개 인스턴스만 시작
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      HOSTNAME: '0.0.0.0',
      SERVER_ID: process.env.HOSTNAME || require('os').hostname(),
      REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
      // 첨삭 시스템용 필수 환경 변수
      GOOGLE_SERVICE_ACCOUNT: process.env.GOOGLE_SERVICE_ACCOUNT,
      UPSTAGE_API_KEY: process.env.UPSTAGE_API_KEY,
      DATABASE_URL: process.env.DATABASE_URL,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
    },
    env_file: '.env',
    
    // Restart configuration
    max_restarts: 10,
    min_uptime: '15s', // 클러스터 모드에서 안정성 확보
    max_memory_restart: '512M', // 인스턴스당 메모리 제한
    
    // Logging - 현재 디렉토리에 로그 저장
    log_file: './logs/combined.log',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    
    // Health monitoring
    watch: false,
    ignore_watch: ['node_modules', '.next', '.git'],
    
    // Graceful shutdown for WebSocket connections (클러스터 최적화)
    kill_timeout: 5000, // 클러스터에서 빠른 재시작
    wait_ready: true,
    listen_timeout: 10000,
    
    // 클러스터 모드 최적화
    instance_var: 'INSTANCE_ID', // 인스턴스별 식별자
    
    // Load balancing
    exec_interpreter: 'node',
    node_args: '--max-old-space-size=256', // 인스턴스당 메모리 최적화
    
    // Auto scaling
    autorestart: true,
    cron_restart: '0 2 * * *', // 매일 새벽 2시 재시작 (메모리 정리)
    
    // 모니터링
    pmx: true,
    instances_log_file: './logs/instances.log'
  }]
};