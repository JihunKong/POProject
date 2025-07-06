'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { Message, Conversation } from '@/types';

const queryClient = new QueryClient();

function ChatInterfaceContent() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation messages
  const loadConversation = async (convId: string) => {
    setIsLoadingMessages(true);
    try {
      const response = await axios.get(`/api/chat/${convId}`);
      const loadedMessages = response.data.messages.map((msg: Message & { timestamp: string }) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp),
      }));
      setMessages(loadedMessages);
      setConversationId(convId);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      alert('대화를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const { data: conversationsData, refetch: refetchConversations } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await axios.get('/api/chat');
      return response.data.conversations as Conversation[];
    },
    enabled: !!session,
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      const response = await axios.post('/api/chat', {
        conversationId,
        message,
      });
      return response.data;
    },
    onSuccess: (data) => {
      setConversationId(data.conversationId);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }]);
      refetchConversations();
    },
    onError: (error) => {
      console.error('메시지 전송 오류:', error);
      alert('메시지 전송에 실패했습니다.');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    sendMessage.mutate(input);
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
  };

  return (
    <div className="flex h-full">
      {/* 사이드바 - 대화 목록 */}
      <div className="w-64 bg-gray-100 p-4 overflow-y-auto">
        <button
          onClick={startNewConversation}
          className="w-full mb-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
        >
          새 대화 시작
        </button>
        
        <h3 className="text-sm font-semibold text-gray-600 mb-2">최근 대화</h3>
        <div className="space-y-2">
          {conversationsData?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left px-3 py-2 rounded-md text-sm hover:bg-gray-200 transition ${
                conversationId === conv.id ? 'bg-gray-200' : ''
              }`}
            >
              <div className="truncate">{conv.title}</div>
              <div className="text-xs text-gray-500">
                {new Date(conv.updatedAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div className="bg-white border-b px-6 py-4">
          <h2 className="text-xl font-semibold">Pure-Ocean 프로젝트 도우미</h2>
          <p className="text-sm text-gray-600">
            질문을 통해 여러분의 생각을 발전시켜 드릴게요!
          </p>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50">
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-ocean-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">대화를 불러오는 중...</p>
              </div>
            </div>
          ) : messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <p className="text-lg mb-4">안녕하세요! 무엇을 도와드릴까요?</p>
              <div className="space-y-2 text-sm">
                <p>💡 &ldquo;해양 플라스틱 문제를 어떻게 접근하면 좋을까요?&rdquo;</p>
                <p>🌊 &ldquo;우리 지역 바다의 특별한 문제가 있을까요?&rdquo;</p>
                <p>🎯 &ldquo;프로젝트 목표를 어떻게 설정하면 좋을까요?&rdquo;</p>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-md px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border shadow-sm'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp?.toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}

          {sendMessage.isPending && (
            <div className="flex justify-start">
              <div className="bg-white border shadow-sm px-4 py-3 rounded-lg">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <form onSubmit={handleSubmit} className="p-4 bg-white border-t">
          <div className="flex space-x-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="궁금한 점을 물어보세요..."
              className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sendMessage.isPending}
            />
            <button
              type="submit"
              disabled={sendMessage.isPending || !input.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              전송
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ChatInterface() {
  return (
    <QueryClientProvider client={queryClient}>
      <ChatInterfaceContent />
    </QueryClientProvider>
  );
}