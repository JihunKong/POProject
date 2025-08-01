'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Message, Conversation } from '@/types';
import { Lightbulb, Waves, Target, Bot, User, Plus, Send, Info, Menu, X, Clock, ChevronRight, MessageSquare, FileText, HelpCircle } from 'lucide-react';

const queryClient = new QueryClient();

type ChatMode = 'grow' | 'assistant' | 'docs';

function ChatInterfaceContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  
  // URL 파라미터에서 초기 chatMode 설정
  const initialChatMode = searchParams.get('mode') as ChatMode || 'grow';
  const [chatMode, setChatMode] = useState<ChatMode>(initialChatMode);
  const [docUrl, setDocUrl] = useState('');
  const [docGenre, setDocGenre] = useState('워크시트');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback((force = false) => {
    if (!isUserScrolling || force) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [isUserScrolling]);

  // Auto scroll only when new messages arrive and user is not scrolling
  useEffect(() => {
    // Only auto-scroll for new messages (not initial load)
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]);

  // Detect user scrolling
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      setIsUserScrolling(!isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

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
      // Don't auto-scroll when loading conversation
      setIsUserScrolling(true);
      // Allow user to manually scroll after loading
      setTimeout(() => setIsUserScrolling(false), 1000);
    } catch (error) {
      console.error('Failed to load conversation:', error);
      alert('대화를 불러오는데 실패했습니다.');
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const { data: conversationsData, refetch: refetchConversations, isLoading: isLoadingConversations, error: conversationsError } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      console.log('Fetching conversations...');
      const response = await axios.get('/api/chat');
      console.log('Conversations response:', response.data);
      return response.data.conversations as Conversation[];
    },
    enabled: !!session,
  });

  const sendMessage = useMutation({
    mutationFn: async (message: string) => {
      let endpoint = '/api/chat';
      let payload: Record<string, unknown> = {
        conversationId,
        message,
      };
      
      if (chatMode === 'assistant') {
        endpoint = '/api/chat/rag';
      } else if (chatMode === 'docs') {
        endpoint = '/api/docs/feedback';
        // Parse doc URL and genre from message
        const match = message.match(/(.+) 첨삭을 요청합니다\. URL: (.+)/);
        if (match) {
          payload = {
            genre: match[1],
            docUrl: match[2],
          };
        }
      }
      
      const response = await axios.post(endpoint, payload);
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
      // Scroll to bottom when assistant responds
      setTimeout(() => scrollToBottom(true), 100);
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
    // Force scroll to bottom when user sends a message
    setTimeout(() => scrollToBottom(true), 100);
  };

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setShowHistory(false);
    setShowMobileMenu(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    if (chatMode === 'docs') {
      // 문서 첨삭 모드에서는 바로 메시지 전송
      const userMessage: Message = {
        role: 'user',
        content: suggestion,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, userMessage]);
      sendMessage.mutate(suggestion);
      // Force scroll to bottom when user sends a message
      setTimeout(() => scrollToBottom(true), 100);
    } else {
      // 다른 모드에서는 기존 방식대로 input에 설정
      setInput(suggestion);
      inputRef.current?.focus();
    }
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
            {isLoadingConversations ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">대화 기록 로딩 중...</p>
              </div>
            ) : conversationsError ? (
              <div className="text-center py-4">
                <p className="text-sm text-red-500">대화 기록을 불러오는데 실패했습니다.</p>
                <button 
                  onClick={() => refetchConversations()}
                  className="text-xs text-blue-600 hover:underline mt-1"
                >
                  다시 시도
                </button>
              </div>
            ) : conversationsData && conversationsData.length > 0 ? (
              conversationsData.map((conv) => (
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
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-sm text-gray-500">아직 대화 기록이 없습니다.</p>
                <p className="text-xs text-gray-400 mt-1">새 대화를 시작해보세요!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full w-full">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="px-4 md:px-6 py-4">
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
                    <p className="text-xs md:text-sm text-gray-600">
                      {chatMode === 'grow' && 'GROW 모델 기반 학습 코칭'}
                      {chatMode === 'assistant' && '프로젝트 도우미'}
                      {chatMode === 'docs' && '문서 첨삭 도우미'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
            <div className="max-w-6xl mx-auto px-4 md:px-6">
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    setChatMode('grow');
                    setMessages([]);
                    setConversationId(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
                    chatMode === 'grow'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <Target className="w-4 h-4" />
                  GROW 코칭
                </button>
                <button
                  onClick={() => {
                    setChatMode('assistant');
                    setMessages([]);
                    setConversationId(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
                    chatMode === 'assistant'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <HelpCircle className="w-4 h-4" />
                  프로젝트 도우미
                </button>
                <button
                  onClick={() => {
                    setChatMode('docs');
                    setMessages([]);
                    setConversationId(null);
                  }}
                  className={`flex items-center gap-2 px-4 py-3 font-medium text-sm transition-colors ${
                    chatMode === 'docs'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-600 hover:text-gray-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  문서 첨삭
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto flex">
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
            ) : chatMode === 'docs' && messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center w-full max-w-4xl px-4">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-purple-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                    <FileText className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                    Pure Ocean 워크시트 첨삭
                  </h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    작성한 Pure Ocean 프로젝트 워크시트를 공유하면 AI가 자세한 피드백을 드립니다
                  </p>
                  
                  <div className="max-w-2xl mx-auto space-y-4">
                    <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
                      <h4 className="font-bold text-gray-800 mb-4">워크시트 정보 입력</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Pure Ocean 워크시트 Google Docs URL
                          </label>
                          <input
                            type="text"
                            value={docUrl}
                            onChange={(e) => setDocUrl(e.target.value)}
                            placeholder="https://docs.google.com/document/d/.../edit"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            작성 중인 문서들을 첨부해주세요.
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            첨삭 유형
                          </label>
                          <select
                            value={docGenre}
                            onChange={(e) => setDocGenre(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="워크시트">프로젝트 워크시트</option>
                            <option value="보고서">최종 보고서</option>
                            <option value="발표자료">PPT 발표자료</option>
                          </select>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (docUrl) {
                              handleSuggestionClick(`${docGenre} 첨삭을 요청합니다. URL: ${docUrl}`);
                            }
                          }}
                          disabled={!docUrl}
                          className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                          첨삭 요청
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-amber-50 rounded-xl p-4 text-sm text-amber-800">
                      <Info className="w-4 h-4 inline mr-2" />
                      Pure Ocean 프로젝트 평가 기준에 따라 각 섹션별로 구체적인 피드백을 제공합니다
                    </div>
                  </div>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center w-full max-w-4xl px-4">
                  <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-400 to-blue-500 rounded-2xl flex items-center justify-center shadow-xl">
                    {chatMode === 'grow' ? (
                      <Target className="w-10 h-10 text-white" />
                    ) : (
                      <HelpCircle className="w-10 h-10 text-white" />
                    )}
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
                    {chatMode === 'grow' ? '안녕하세요! 여러분, 무엇을 도와드릴까요?' : '프로젝트 도우미입니다. 무엇이든 물어보세요!'}
                  </h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    {chatMode === 'grow' ? '여러분의 아이디어를 단계별로 발전시켜 드릴게요' : '프로젝트 관련 모든 질문에 답해드립니다'}
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 justify-center">
                    {chatMode === 'grow' ? (
                      <>
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
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => handleSuggestionClick("설문조사 항목을 만들어주세요")}
                          className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-blue-200"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                              <MessageSquare className="w-6 h-6 text-blue-600" />
                            </div>
                            <h4 className="font-bold text-gray-800">설문 도움</h4>
                          </div>
                          <p className="text-sm text-gray-600">설문조사 항목을 만들어주세요</p>
                        </button>

                        <button
                          onClick={() => handleSuggestionClick("SDGs와 연결된 프로젝트 아이디어를 제안해주세요")}
                          className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-green-200"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                              <Lightbulb className="w-6 h-6 text-green-600" />
                            </div>
                            <h4 className="font-bold text-gray-800">SDGs 연계</h4>
                          </div>
                          <p className="text-sm text-gray-600">SDGs와 연결된 프로젝트 아이디어를 제안해주세요</p>
                        </button>

                        <button
                          onClick={() => handleSuggestionClick("프로젝트 일정표를 만들어주세요")}
                          className="group bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-left border-2 border-transparent hover:border-purple-200"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                              <Clock className="w-6 h-6 text-purple-600" />
                            </div>
                            <h4 className="font-bold text-gray-800">일정 계획</h4>
                          </div>
                          <p className="text-sm text-gray-600">프로젝트 일정표를 만들어주세요</p>
                        </button>
                      </>
                    )}
                  </div>

                  <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800">
                    <Info className="w-4 h-4 inline mr-2" />
                    {chatMode === 'grow' ? 'GROW 모델(목표-현실-대안-실행)을 기반으로 한 단계씩 질문드릴게요' : 'Pure Ocean 프로젝트 자료를 기반으로 답변해드립니다'}
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
                        <div className={`whitespace-pre-wrap ${
                          message.role === 'user' ? 'text-white' : 'text-gray-800'
                        }`}>
                          {message.role === 'assistant' ? (
                            <div className="prose prose-sm max-w-none prose-p:my-2 prose-ul:my-2 prose-ol:my-2">
                              <ReactMarkdown
                                components={{
                                  a: ({ ...props }) => (
                                    <a 
                                      {...props} 
                                      className={`underline hover:no-underline ${
                                        message.role === 'user' 
                                          ? 'text-blue-100 hover:text-white' 
                                          : 'text-blue-600 hover:text-blue-800'
                                      }`}
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                    />
                                  ),
                                  strong: ({ ...props }) => (
                                    <strong {...props} className="font-bold" />
                                  ),
                                  p: ({ ...props }) => (
                                    <p {...props} className="mb-2 last:mb-0" />
                                  ),
                                  ul: ({ ...props }) => (
                                    <ul {...props} className="list-disc list-inside mb-2" />
                                  ),
                                  ol: ({ ...props }) => (
                                    <ol {...props} className="list-decimal list-inside mb-2" />
                                  ),
                                  li: ({ ...props }) => (
                                    <li {...props} className="mb-1" />
                                  )
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            message.content
                          )}
                        </div>
                        {message.timestamp && (
                          <div className={`text-xs mt-2 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-400'
                          }`}>
                            {message.timestamp.toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                        )}
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
        {chatMode !== 'docs' && (
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
        )}
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