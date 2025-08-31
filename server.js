const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server: IOServer } = require('socket.io');
const { PrismaClient } = require('@prisma/client');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Next.js 앱 초기화
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Prisma 클라이언트 초기화
const prisma = new PrismaClient();

// Socket.IO 인터페이스
const SOCRATIC_SYSTEM_PROMPT = `당신은 완도고등학교 Pure Ocean 프로젝트의 AI 코치입니다.

역할:
- 고등학교 2학년 학생들의 해양 환경 보호 프로젝트 지도
- GROW 모델(Goal-Reality-Options-Will)을 활용한 체계적 코칭
- 소크라테스식 질문법을 통한 학생들의 자기주도적 사고 유도

핵심 원칙:
1. 직접적 답변 대신 질문을 통해 학생들 스스로 답을 찾도록 유도
2. 학생 수준에 맞는 친근하고 격려적인 톤 유지  
3. 해양 환경 보호와 SDGs 14번 목표 연계
4. 구체적 실행 방안 도출을 위한 단계적 접근

대화 방식:
- "어떻게 생각해?" "왜 그럴까?" "다른 방법은 없을까?" 등 열린 질문 활용
- 학생의 답변을 인정하고 더 깊이 탐구하도록 격려
- 막힐 때는 작은 힌트나 예시를 들어 사고의 실마리 제공`;

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Socket.IO 서버 초기화 - 최신 베스트 프랙티스 적용
  const io = new IOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://xn--ox6bo4n.com', 'https://www.xn--ox6bo4n.com'] 
        : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
      credentials: true,
      methods: ['GET', 'POST'],
      allowedHeaders: ['authorization', 'content-type'],
    },
    
    // 전송 방식 - WebSocket 우선, polling fallback
    transports: ['websocket', 'polling'],
    
    // Socket.IO 4.6.0+ Connection State Recovery 활성화
    connectionStateRecovery: {
      // 최대 연결 끊김 지속 시간 (2분)
      maxDisconnectionDuration: 2 * 60 * 1000,
      // 인증 미들웨어 건너뛰기 (재연결 시 빠른 복구)
      skipMiddlewares: true,
    },
    
    // 최적화된 heartbeat 설정
    pingTimeout: 20000, // 20초 - 더 안정적
    pingInterval: 25000, // 25초 - 네트워크 부하 최소화
    
    // 업그레이드 설정
    upgradeTimeout: 10000, // WebSocket 업그레이드 대기 시간
    allowUpgrades: true,
    
    // 메모리 및 성능 최적화
    maxHttpBufferSize: 1e6, // 1MB 버퍼 크기
    httpCompression: true, // HTTP 압축 활성화
    compression: true, // WebSocket 압축 활성화
    
    // Socket.IO 4.7.0+ 쿠키 지원
    cookie: {
      name: 'io',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    },
    
    // 보안 강화
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      const referer = req.headers.referer;
      
      console.log('🔍 WebSocket connection attempt:', { 
        origin, 
        referer, 
        userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
      });
      
      // 프로덕션에서는 origin 검증
      if (process.env.NODE_ENV === 'production') {
        const allowedOrigins = ['https://xn--ox6bo4n.com', 'https://www.xn--ox6bo4n.com'];
        if (origin && !allowedOrigins.includes(origin)) {
          console.warn('❌ Rejected connection from unauthorized origin:', origin);
          return callback(new Error('Unauthorized origin'), false);
        }
      }
      
      callback(null, true);
    },
    
    // 연결 제한
    connectTimeout: 45000, // 45초 연결 타임아웃
    
    // Engine.IO 설정
    allowEIO3: false, // 최신 버전만 사용
  });

  // 향상된 인증 미들웨어
  io.use(async (socket, next) => {
    const startTime = Date.now();
    
    try {
      const token = socket.handshake.auth.token;
      const clientVersion = socket.handshake.headers['client-version'];
      const userAgent = socket.handshake.headers['user-agent'];
      
      console.log('🔐 Authenticating socket:', {
        id: socket.id,
        clientVersion,
        transport: socket.conn.transport.name,
        remoteAddress: socket.conn.remoteAddress,
      });

      if (!token || typeof token !== 'string') {
        console.warn('❌ Authentication failed: Missing or invalid token');
        return next(new Error('Authentication token required'));
      }

      // 기본 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(token)) {
        console.warn('❌ Authentication failed: Invalid email format', token);
        return next(new Error('Invalid email format'));
      }

      // 사용자 정보 설정
      socket.userId = token;
      socket.userEmail = token;
      socket.connectedAt = Date.now();
      socket.metadata = {
        userAgent: userAgent?.substring(0, 100),
        clientVersion,
        transport: socket.conn.transport.name,
      };

      const authTime = Date.now() - startTime;
      console.log(`✅ Authentication successful for ${token} (${authTime}ms)`);
      
      next();
    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      next(new Error('Authentication process failed'));
    }
  });

  // 연결 상태 모니터링을 위한 맵
  const activeConnections = new Map();
  const connectionStats = {
    total: 0,
    active: 0,
    reconnections: 0,
    errors: 0,
  };

  io.on('connection', (socket) => {
    const connectionTime = Date.now();
    connectionStats.total++;
    connectionStats.active++;
    
    // 연결 정보 저장
    activeConnections.set(socket.id, {
      userEmail: socket.userEmail,
      connectedAt: connectionTime,
      lastActivity: connectionTime,
      transport: socket.conn.transport.name,
      recovered: socket.recovered || false, // Connection State Recovery
    });

    console.log(`🔌 User connected: ${socket.userEmail}`, {
      socketId: socket.id,
      transport: socket.conn.transport.name,
      recovered: socket.recovered ? '🔄 Recovered' : '🆕 New',
      activeConnections: connectionStats.active,
      totalConnections: connectionStats.total,
    });

    // Connection State Recovery 처리
    if (socket.recovered) {
      connectionStats.reconnections++;
      console.log(`🔄 Connection recovered for ${socket.userEmail} (${socket.id})`);
      
      // 복구된 연결에 대한 추가 처리
      socket.emit('connection:recovered', {
        message: 'Connection recovered successfully',
        timestamp: Date.now(),
      });
    }

    // 활동 시간 업데이트 헬퍼
    const updateActivity = () => {
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.lastActivity = Date.now();
      }
    };

    // 채팅 메시지 처리 - 에러 핸들링 강화
    socket.on('chat:message', async (data, callback) => {
      updateActivity();
      const messageStartTime = Date.now();
      
      try {
        console.log(`💬 Message from ${socket.userEmail}:`, {
          messageLength: data?.message?.length,
          conversationId: data?.conversationId,
          assistantMode: data?.assistantMode,
        });
        
        // 입력 검증
        if (!data || !data.message || typeof data.message !== 'string') {
          throw new Error('Invalid message format');
        }
        
        if (data.message.length > 10000) {
          throw new Error('Message too long (max 10000 characters)');
        }

        await handleChatMessage(socket, data);
        
        // 콜백으로 성공 확인 (있는 경우)
        if (typeof callback === 'function') {
          callback({ success: true, timestamp: Date.now() });
        }
        
        const messageTime = Date.now() - messageStartTime;
        console.log(`✅ Message processed in ${messageTime}ms`);
        
      } catch (error) {
        connectionStats.errors++;
        console.error(`❌ Chat message error for ${socket.userEmail}:`, error);
        
        const errorResponse = {
          type: 'error',
          error: error.message || 'Message processing failed',
          timestamp: Date.now(),
          retryable: !error.message?.includes('Invalid') && !error.message?.includes('too long'),
        };
        
        socket.emit('chat:response', errorResponse);
        
        // 콜백으로 에러 전송 (있는 경우)
        if (typeof callback === 'function') {
          callback({ success: false, error: error.message });
        }
      }
    });

    // heartbeat 응답
    socket.on('ping', (timestamp, callback) => {
      updateActivity();
      if (typeof callback === 'function') {
        callback();
      }
      socket.emit('pong', timestamp);
    });

    // 클라이언트 상태 확인
    socket.on('client:status', (data, callback) => {
      updateActivity();
      const connection = activeConnections.get(socket.id);
      
      if (typeof callback === 'function') {
        callback({
          server: {
            timestamp: Date.now(),
            uptime: process.uptime(),
            connections: connectionStats,
          },
          connection: {
            ...connection,
            sessionDuration: Date.now() - connection.connectedAt,
          },
        });
      }
    });

    // 연결 해제 처리 - 상세한 로깅
    socket.on('disconnect', (reason, details) => {
      connectionStats.active--;
      const connection = activeConnections.get(socket.id);
      
      if (connection) {
        const sessionDuration = Date.now() - connection.connectedAt;
        const lastActivityAgo = Date.now() - connection.lastActivity;
        
        console.log(`🔌 User disconnected: ${socket.userEmail}`, {
          socketId: socket.id,
          reason,
          sessionDuration: `${Math.round(sessionDuration / 1000)}s`,
          lastActivity: `${Math.round(lastActivityAgo / 1000)}s ago`,
          activeConnections: connectionStats.active,
          transport: connection.transport,
        });
        
        activeConnections.delete(socket.id);
      } else {
        console.log(`🔌 Unknown socket disconnected: ${socket.id} (reason: ${reason})`);
      }
    });

    // 향상된 에러 핸들링
    socket.on('error', (error) => {
      connectionStats.errors++;
      console.error(`❌ Socket error for ${socket.userEmail}:`, {
        error: error.message,
        socketId: socket.id,
        transport: socket.conn.transport.name,
        timestamp: new Date().toISOString(),
      });
    });

    // 연결 상태 변화 모니터링
    socket.conn.on('upgrade', () => {
      console.log(`⬆️ Connection upgraded to WebSocket: ${socket.userEmail} (${socket.id})`);
      const connection = activeConnections.get(socket.id);
      if (connection) {
        connection.transport = 'websocket';
      }
    });

    socket.conn.on('upgradeError', (error) => {
      console.warn(`⚠️ WebSocket upgrade failed for ${socket.userEmail}:`, error.message);
    });
  });

  // 채팅 메시지 처리 함수
  async function handleChatMessage(socket, data) {
    const { message, conversationId, assistantMode = 'general', chatMode } = data;

    try {
      // 사용자 찾기 또는 생성
      let user = await prisma.user.findUnique({
        where: { email: socket.userEmail },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: socket.userEmail,
            name: socket.userEmail.split('@')[0],
          },
        });
      }

      // 대화 처리 (코칭 모드가 아닐 때만)
      let conversation = null;
      if (assistantMode !== 'coaching') {
        if (conversationId) {
          conversation = await prisma.conversation.findUnique({
            where: { id: conversationId, userId: user.id },
            include: { messages: { orderBy: { createdAt: 'asc' } } }
          });
        }

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              userId: user.id,
              title: message.substring(0, 50),
            },
            include: { messages: true },
          });
        }

        // 사용자 메시지 저장
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'USER',
            content: message,
          },
        });
      }

      // 분석 데이터 저장
      await prisma.analytics.create({
        data: {
          userId: user.id,
          eventType: 'websocket_chat',
          eventData: {
            conversationId: conversation?.id || 'coaching-session',
            messageLength: message.length,
            timestamp: new Date().toISOString(),
            assistantMode,
            chatMode,
          }
        }
      });

      // AI 응답 생성 (Upstage API 호출)
      await generateAIResponse(socket, {
        message,
        conversation,
        assistantMode,
        chatMode,
      });

    } catch (error) {
      console.error('Handle chat message error:', error);
      socket.emit('chat:response', {
        type: 'error',
        error: 'Failed to process message'
      });
    }
  }

  // AI 응답 생성 및 스트리밍
  async function generateAIResponse(socket, { message, conversation, assistantMode, chatMode }) {
    try {
      // Upstage Solar-Pro2 API 호출
      const fetch = (await import('node-fetch')).default;
      
      let systemPrompt = SOCRATIC_SYSTEM_PROMPT;
      
      // 메시지 구성
      const messages = [
        { role: 'system', content: systemPrompt },
      ];

      // 코칭 모드가 아닐 때만 이전 대화 포함
      if (conversation && assistantMode !== 'coaching') {
        messages.push(...conversation.messages.map(msg => ({
          role: msg.role.toLowerCase(),
          content: msg.content
        })));
      }

      messages.push({ role: 'user', content: message });

      const response = await fetch('https://api.upstage.ai/v1/solar/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.UPSTAGE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'solar-pro2',
          messages,
          temperature: 0.7,
          max_tokens: 1500,
          stream: true,
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      let fullMessage = '';
      
      // 스트리밍 응답 처리
      const decoder = new TextDecoder();
      const reader = response.body.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const jsonStr = line.slice(6);
              if (jsonStr === '[DONE]') continue;
              
              try {
                const data = JSON.parse(jsonStr);
                const content = data.choices?.[0]?.delta?.content || '';
                
                if (content) {
                  fullMessage += content;
                  
                  // 실시간으로 청크 전송
                  socket.emit('chat:response', {
                    type: 'chunk',
                    content,
                    conversationId: conversation?.id || null
                  });
                }
              } catch (parseError) {
                // JSON 파싱 오류 무시
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      // 완료 신호 전송
      socket.emit('chat:response', {
        type: 'complete',
        conversationId: conversation?.id || null,
        fullMessage
      });

      // AI 응답 저장 (코칭 모드가 아닐 때만)
      if (conversation && assistantMode !== 'coaching') {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            role: 'ASSISTANT',
            content: fullMessage,
          },
        });
      }

    } catch (error) {
      console.error('Generate AI response error:', error);
      socket.emit('chat:response', {
        type: 'error',
        error: 'Failed to generate response'
      });
    }
  }

  // Redis 어댑터 설정 (프로덕션 환경에서만)
  if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
    (async () => {
      try {
        const pubClient = createClient({
          url: process.env.REDIS_URL,
          retryDelayOnFailover: 100,
          retryDelayOnClusterDown: 300,
          retryDelayOnMoved: 100,
          maxRetriesPerRequest: 3
        });
        
        const subClient = pubClient.duplicate();

        await pubClient.connect();
        await subClient.connect();
        
        io.adapter(createAdapter(pubClient, subClient));
        
        console.log('🚀 Socket.IO server initialized with Redis clustering');

        // Redis 연결 상태 모니터링
        pubClient.on('error', (error) => {
          console.error('❌ Redis Pub Client Error:', error);
        });

        subClient.on('error', (error) => {
          console.error('❌ Redis Sub Client Error:', error);
        });

        // Graceful shutdown에 Redis 정리 추가
        const originalShutdown = gracefulShutdown;
        gracefulShutdown = async (signal) => {
          console.log('🧹 Disconnecting Redis clients...');
          try {
            await pubClient.disconnect();
            await subClient.disconnect();
            console.log('✅ Redis clients disconnected');
          } catch (error) {
            console.error('❌ Error disconnecting Redis:', error);
          }
          originalShutdown(signal);
        };

        // 서버 간 스케일링 이벤트 모니터링
        io.of("/").adapter.on("create-room", (room) => {
          console.log(`🏠 Room ${room} created`);
        });

        io.of("/").adapter.on("delete-room", (room) => {
          console.log(`🏠 Room ${room} deleted`);
        });

        // 주기적 서버 상태 브로드캐스트
        const serverId = process.env.SERVER_ID || `server-${Date.now()}`;
        setInterval(() => {
          const stats = {
            serverId,
            connections: connectionStats.active,
            totalConnections: connectionStats.total,
            uptime: process.uptime(),
            memory: process.memoryUsage().heapUsed,
            timestamp: Date.now()
          };
          io.serverSideEmit('server-stats', stats);
        }, 30000); // 30초마다

      } catch (error) {
        console.error('❌ Redis setup failed, continuing without clustering:', error);
        console.log('🚀 Socket.IO server initialized without Redis clustering');
      }
    })();
  } else {
    console.log('🚀 Socket.IO server initialized with enhanced features (single instance)');
  }

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`🌐 Server ready on http://${hostname}:${port}`);
    console.log(`🔌 WebSocket server ready on ws://${hostname}:${port}`);
  });

  // Graceful shutdown with WebSocket connection cleanup
  const gracefulShutdown = async (signal) => {
    console.log(`🛑 ${signal} received, shutting down gracefully`);
    
    // WebSocket 연결 정리
    io.disconnectSockets(true);
    console.log('🔌 All WebSocket connections closed');
    
    // Prisma 연결 해제
    try {
      await prisma.$disconnect();
      console.log('🗄️ Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database:', error);
    }
    
    // HTTP 서버 종료
    httpServer.close((err) => {
      if (err) {
        console.error('❌ Error during shutdown:', err);
        process.exit(1);
      }
      console.log('✅ Server closed gracefully');
      process.exit(0);
    });

    // 강제 종료 타이머 (10초 후)
    setTimeout(() => {
      console.error('⚠️ Forced shutdown due to timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Uncaught Exception 처리
  process.on('uncaughtException', (err) => {
    console.error('💥 Uncaught Exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
  });
  
  // Unhandled Promise Rejection 처리
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('UNHANDLED_REJECTION');
  });
});