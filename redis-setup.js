// Redis를 사용한 Socket.IO 스케일링 구성
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

// Redis 어댑터 설정 함수
async function setupRedisAdapter(io) {
  try {
    // Redis 클라이언트 생성
    const pubClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retryDelayOnFailover: 100,
      retryDelayOnClusterDown: 300,
      retryDelayOnMoved: 100,
      maxRetriesPerRequest: 3
    });
    
    const subClient = pubClient.duplicate();

    // Redis 연결
    await pubClient.connect();
    await subClient.connect();
    
    console.log('✅ Redis clients connected successfully');

    // Socket.IO Redis 어댑터 설정
    io.adapter(createAdapter(pubClient, subClient));
    
    console.log('🚀 Socket.IO Redis adapter configured');

    // Redis 연결 상태 모니터링
    pubClient.on('error', (error) => {
      console.error('❌ Redis Pub Client Error:', error);
    });

    subClient.on('error', (error) => {
      console.error('❌ Redis Sub Client Error:', error);
    });

    pubClient.on('connect', () => {
      console.log('📡 Redis Pub Client connected');
    });

    subClient.on('connect', () => {
      console.log('📡 Redis Sub Client connected');
    });

    // Graceful shutdown
    const cleanup = async () => {
      console.log('🧹 Disconnecting Redis clients...');
      await pubClient.disconnect();
      await subClient.disconnect();
      console.log('✅ Redis clients disconnected');
    };

    return { cleanup, pubClient, subClient };
    
  } catch (error) {
    console.error('❌ Redis setup failed:', error);
    throw error;
  }
}

// 스케일링을 위한 추가 구성
function configureScaling(io, redisClients) {
  // 서버 간 방 관리
  io.of("/").adapter.on("create-room", (room) => {
    console.log(`🏠 Room ${room} was created`);
  });

  io.of("/").adapter.on("delete-room", (room) => {
    console.log(`🏠 Room ${room} was deleted`);
  });

  io.of("/").adapter.on("join-room", (room, id) => {
    console.log(`🏠 Socket ${id} joined room ${room}`);
  });

  io.of("/").adapter.on("leave-room", (room, id) => {
    console.log(`🏠 Socket ${id} left room ${room}`);
  });

  // 서버 간 메시지 브로드캐스트
  const serverStats = {
    serverId: process.env.SERVER_ID || `server-${Date.now()}`,
    startTime: Date.now(),
    connections: 0
  };

  // 주기적으로 서버 상태 브로드캐스트
  setInterval(() => {
    const stats = {
      ...serverStats,
      connections: io.engine.clientsCount,
      uptime: Date.now() - serverStats.startTime,
      memory: process.memoryUsage(),
    };

    io.serverSideEmit('server-stats', stats);
  }, 30000); // 30초마다

  return serverStats;
}

module.exports = { setupRedisAdapter, configureScaling };