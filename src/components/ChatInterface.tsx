'use client';

import { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useMutation, useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import { Message, Conversation } from '@/types';
import { MessageCircle, HandMetal, Lightbulb, Waves, Target, Bot, User, Plus, Send, Info, Menu, X, Clock, ChevronRight } from 'lucide-react';

const queryClient = new QueryClient();

function ChatInterfaceContent() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = inputRef.current.scrollHeight + 'px';
    }
  }, [input]);

  // Load conversation messages
  const loadConversation = async (convId: string) => {
    setIsLoadingMessages(true);
    setShowHistory(false);
    setShowMobileMenu(false);
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
    if (!input.trim() || sendMessage.isPending) return;

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
    setShowHistory(false);
    setShowMobileMenu(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full w-full bg-gradient-to-br from-blue-50 via-white to-cyan-50">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setShowMobileMenu(!showMobileMenu)}
        className="lg:hidden fixed top-20 left-4 z-50 p-2 bg-white rounded-xl shadow-lg"
      >
        {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* History Sidebar - Mobile Overlay */}
      {showMobileMenu && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setShowMobileMenu(false)}
        />
      )}

      {/* History Sidebar */}
      <div className={`
        fixed lg:relative lg:flex
        ${showMobileMenu ? 'left-0' : '-left-full lg:left-0'}
        ${showHistory ? 'lg:w-80' : 'lg:w-0'}
        top-0 h-full w-80 bg-white shadow-xl
        transition-all duration-300 ease-in-out z-50
        overflow-hidden
      `}>
        <div className="w-80 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-800">대화 기록</h3>
            <button
              onClick={() => {
                setShowHistory(false);
                setShowMobileMenu(false);
              }}
              className="p-2 hover:bg-gray-100 rounded-lg lg:block hidden"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={startNewConversation}
            className="btn-primary w-full mb-4 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>새 대화 시작</span>
          </button>

          <div className="space-y-2">
            {conversationsData?.map((conv) => (
              <button
                key={conv.id}
                onClick={() => loadConversation(conv.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 ${
                  conversationId === conv.id 
                    ? 'bg-blue-50 border-2 border-blue-300' 
                    : 'hover:bg-gray-50 border-2 border-transparent'
                }`}
              >
                <div className="font-medium text-gray-800 mb-1">{conv.title}</div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3 h-3" />
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
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm px-4 md:px-6 py-4">
          <div className="flex items-center justify-between max-w-6xl mx-auto">
            <div className="flex items-center gap-3">
              {!showHistory && (
                <button
                  onClick={() => setShowHistory(true)}
                  className="hidden lg:flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Clock className="w-4 h-4" />
                  대화 기록
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                  <Waves className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-gray-800">Pure Ocean AI 코치</h2>
                  <p className="text-xs md:text-sm text-gray-600">GROW 모델 기반 학습 코칭</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto flex">
          <div className="w-full max-w-5xl mx-auto p-4 md:p-6">
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
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center w-full max-w-4xl px-4">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <Bot className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                    안녕하세요! Pure Ocean 여러분, 무엇을 도와드릴까요?
                  </h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    여러분의 아이디어를 단계별로 발전시켜 드릴게요
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 justify-center">
                    <button
                      onClick={() => handleSuggestionClick("우리 지역 해양 문제를 조사하고 싶어요")}
                      className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-blue-200"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <Target className="w-6 h-6 text-blue-600" />
                        </div>
                        <h4 className="font-bold text-gray-800">목표 설정</h4>
                      </div>
                      <p className="text-sm text-gray-600">우리 지역 해양 문제를 조사하고 싶어요</p>
                    </button>

                    <button
                      onClick={() => handleSuggestionClick("해양 플라스틱 문제를 해결하는 프로젝트를 하고 싶어요")}
                      className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-green-200"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                          <Lightbulb className="w-6 h-6 text-green-600" />
                        </div>
                        <h4 className="font-bold text-gray-800">아이디어 탐색</h4>
                      </div>
                      <p className="text-sm text-gray-600">해양 플라스틱 문제를 해결하는 프로젝트를 하고 싶어요</p>
                    </button>

                    <button
                      onClick={() => handleSuggestionClick("팀원들과 역할 분담을 어떻게 하면 좋을까요?")}
                      className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-purple-200"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                          <User className="w-6 h-6 text-purple-600" />
                        </div>
                        <h4 className="font-bold text-gray-800">팀 협업</h4>
                      </div>
                      <p className="text-sm text-gray-600">팀원들과 역할 분담을 어떻게 하면 좋을까요?</p>
                    </button>
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                    <Info className="w-4 h-4 inline mr-2" />
                    GROW 모델(목표-현실-대안-실행)을 기반으로 한 단계씩 질문드릴게요
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {message.role === 'assistant' && (
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                          <Bot className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    )}
                    
                    <div className={`max-w-2xl ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                      <div className={`rounded-2xl px-6 py-4 shadow-sm ${
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <p className={`whitespace-pre-wrap ${
                          message.role === 'user' ? 'text-white' : 'text-gray-800'
                        }`}>
                          {message.content}
                        </p>
                        <div className={`text-xs mt-2 ${
                          message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                        }`}>
                          {message.timestamp.toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>

                    {message.role === 'user' && (
                      <div className="flex-shrink-0 order-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center">
                          <User className="w-6 h-6 text-gray-600" />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {sendMessage.isPending && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-xl flex items-center justify-center shadow-md">
                        <Bot className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-6 py-4 shadow-sm">
                      <div className="loading-wave text-gray-400">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSubmit} className="max-w-5xl mx-auto">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e);
                    }
                  }}
                  placeholder="궁금한 점을 물어보세요..."
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl 
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           resize-none min-h-[52px] max-h-32"
                  rows={1}
                />
                <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                  Shift + Enter로 줄바꿈
                </div>
              </div>
              <button
                type="submit"
                disabled={!input.trim() || sendMessage.isPending}
                className="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-2"
              >
                <Send className="w-5 h-5" />
                <span className="hidden sm:inline">전송</span>
              </button>
            </div>
          </form>
        </div>
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