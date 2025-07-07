'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { Message, Conversation } from '@/types';
import { MessageCircle, HandMetal, Lightbulb, Waves, Target, Bot, User, Plus, Send, Info } from 'lucide-react';

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
      <div className="w-64 glass-light backdrop-blur-xl border-r border-white/20 p-4 overflow-y-auto">
        <button
          onClick={startNewConversation}
          className="btn-primary w-full mb-6 flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          <span>새 대화 시작</span>
        </button>
        
        <h3 className="text-sm font-bold text-gray-700 mb-3 px-2">최근 대화</h3>
        <div className="space-y-2">
          {conversationsData?.map((conv) => (
            <button
              key={conv.id}
              onClick={() => loadConversation(conv.id)}
              className={`w-full text-left p-3 rounded-xl text-sm transition-all duration-200 ${
                conversationId === conv.id 
                  ? 'bg-white/90 shadow-md border border-blue-200' 
                  : 'hover:bg-white/50 hover:shadow-sm'
              }`}
            >
              <div className="font-medium text-gray-800 truncate mb-1">{conv.title}</div>
              <div className="text-xs text-gray-500">
                {new Date(conv.updatedAt).toLocaleDateString('ko-KR', {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div className="glass-light backdrop-blur-xl border-b border-white/20 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Pure Ocean 프로젝트 도우미</h2>
              <p className="text-sm text-gray-600">
                소크라테스식 질문으로 여러분의 아이디어를 발전시켜요
              </p>
            </div>
          </div>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          {isLoadingMessages ? (
            <div className="flex justify-center items-center h-full">
              <div className="text-center">
                <div className="loading-wave text-blue-500 mb-4">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                <p className="text-gray-600 font-medium">대화를 불러오는 중...</p>
              </div>
            </div>
          ) : messages.length === 0 && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center max-w-2xl mx-auto">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-3xl flex items-center justify-center shadow-2xl float-animation">
                  <HandMetal className="w-12 h-12 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-800 mb-4">안녕하세요! 무엇을 도와드릴까요?</h3>
                <p className="text-gray-600 mb-8">해양 프로젝트에 대한 궁금한 점을 자유롭게 물어보세요</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="card-glass p-4 hover:scale-105 transition-transform cursor-pointer">
                    <Lightbulb className="w-8 h-8 mb-2 block text-yellow-500" />
                    <p className="text-sm font-medium text-gray-700">해양 플라스틱 문제를 어떻게 접근하면 좋을까요?</p>
                  </div>
                  <div className="card-glass p-4 hover:scale-105 transition-transform cursor-pointer">
                    <Waves className="w-8 h-8 mb-2 block text-blue-500" />
                    <p className="text-sm font-medium text-gray-700">우리 지역 바다의 특별한 문제가 있을까요?</p>
                  </div>
                  <div className="card-glass p-4 hover:scale-105 transition-transform cursor-pointer">
                    <Target className="w-8 h-8 mb-2 block text-red-500" />
                    <p className="text-sm font-medium text-gray-700">프로젝트 목표를 어떻게 설정하면 좋을까요?</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div
                className={`max-w-md md:max-w-2xl px-5 py-4 rounded-2xl ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                    : 'bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md'
                }`}
              >
                <p className={`text-sm md:text-base leading-relaxed ${
                  message.role === 'user' ? 'text-white' : 'text-gray-800'
                }`}>{message.content}</p>
                <p className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {message.timestamp?.toLocaleTimeString('ko-KR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-500 rounded-xl flex items-center justify-center shadow-md">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {sendMessage.isPending && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md animate-pulse">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white/90 backdrop-blur-sm border border-gray-200 shadow-md px-5 py-4 rounded-2xl">
                <div className="loading-wave text-gray-400">
                  <span></span>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 입력 영역 */}
        <form onSubmit={handleSubmit} className="p-4 glass-light backdrop-blur-xl border-t border-white/20">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="궁금한 점을 물어보세요..."
                className="input flex-1"
                disabled={sendMessage.isPending}
              />
              <button
                type="submit"
                disabled={sendMessage.isPending || !input.trim()}
                className="btn-primary px-8 flex items-center gap-2"
              >
                <span>전송</span>
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center justify-center mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                Shift + Enter로 줄바꿈 가능
              </span>
            </div>
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