
import React, { useState, useRef, useEffect } from 'react';
import { chatWithAgent } from '../../services/api';
import { AgentMessage, Citation } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card, { CardContent } from '../ui/Card';
import Spinner from '../ui/Spinner';
import Badge from '../ui/Badge';
import FileIcon from '../icons/FileIcon';
import * as VFS from '../../services/vfs';

const renderMarkdown = (text: string) => {
  // Simple markdown rendering for basic formatting
  let html = text
    // Headers (순서 중요: 더 긴 패턴부터 처리)
    .replace(/^##### (.*$)/gm, '<h5 class="text-sm font-semibold mt-3 mb-2 text-white">$1</h5>')
    .replace(/^#### (.*$)/gm, '<h4 class="text-base font-semibold mt-3 mb-2 text-white">$1</h4>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-4 mb-2 text-white">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-semibold mt-4 mb-2 text-white">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold mt-4 mb-2 text-white">$1</h1>')
    // Bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-slate-800 p-3 rounded-md mt-2 mb-2 overflow-x-auto"><code class="text-sm">$1</code></pre>')
    .replace(/`(.*?)`/g, '<code class="bg-slate-800 px-2 py-1 rounded text-sm">$1</code>')
    // Lists
    .replace(/^[\s]*\* (.*$)/gm, '<li class="ml-4">• $1</li>')
    .replace(/^[\s]*- (.*$)/gm, '<li class="ml-4">• $1</li>')
    .replace(/^[\s]*• (.*$)/gm, '<li class="ml-4">• $1</li>')
    // Line breaks
    .replace(/\n/g, '<br/>');

  return html;
};

const MessageBubble: React.FC<{ message: AgentMessage }> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-4 ${isUser ? 'justify-end' : ''}`}>
      {!isUser && (
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-indigo-400">
          AI
        </div>
      )}
      <div className={`max-w-xl rounded-lg px-4 py-3 ${isUser ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</div>
        ) : (
          <div 
            className="text-sm leading-relaxed prose prose-sm prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }}
          />
        )}
        {!isUser && message.used_tools && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.used_tools.map(tool => <Badge key={tool} variant="info">{tool}</Badge>)}
          </div>
        )}
        {!isUser && message.citations && message.citations.length > 0 && (
          <div className="mt-3 border-t border-slate-600 pt-3">
             <h4 className="text-xs font-bold text-slate-400 mb-2">인용</h4>
            {message.citations.map((cite, i) => (
              <div key={i} className="text-xs text-slate-400 p-2 bg-slate-800/50 rounded-md mt-1">
                <p className="italic">"...{cite.quote.substring(0, 40)}..."</p>
                <div className="flex items-center mt-1">
                    <FileIcon className="h-3 w-3 mr-1.5"/>
                    <span>{cite.filename} (p. {cite.page_no})</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
       {isUser && (
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold">
          나
        </div>
      )}
    </div>
  );
};

const AgentsPage: React.FC = () => {
    const [messages, setMessages] = useState<AgentMessage[]>([]);
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [chatHistories, setChatHistories] = useState<any[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        loadChatHistories();
    }, []);

    const loadChatHistories = () => {
        const histories = VFS.getChatHistory();
        setChatHistories(histories);
    };

    const saveChatHistory = () => {
        if (messages.length > 0) {
            VFS.saveChatSession(messages);
            loadChatHistories();
        }
    };

    const loadChatSession = (sessionId: string) => {
        const sessionMessages = VFS.loadChatSession(sessionId);
        setMessages(sessionMessages);
        setShowHistory(false);
    };

    const deleteChatSession = (sessionId: string) => {
        VFS.deleteChatSession(sessionId);
        loadChatHistories();
    };

    const clearCurrentChat = () => {
        setMessages([]);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim() || isLoading) return;

        const userMessage: AgentMessage = {
            id: `msg-${Date.now()}`,
            role: 'user',
            content: query,
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setQuery('');
        setIsLoading(true);

        try {
            const agentResponse = await chatWithAgent(messages, query);
            setMessages(prev => [...prev, agentResponse]);
        } catch (error) {
            const errorMessage: AgentMessage = {
                id: `err-${Date.now()}`,
                role: 'agent',
                content: '죄송합니다, 오류가 발생했습니다. 다시 시도해 주세요.',
                timestamp: new Date().toISOString()
            };
            setMessages(prev => [...prev, errorMessage]);
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 sm:p-8">
            <h1 className="text-3xl font-bold text-white mb-6 flex-shrink-0">HMK홀딩스 Agent입니다. 지식을 만들어 보세요.</h1>
            <Card className="flex-grow flex flex-col h-0">
                <CardContent className="flex-grow p-4 overflow-y-auto space-y-6" ref={chatContainerRef}>
                    {messages.length === 0 && (
                        <div className="text-center text-slate-500 pt-16">
                            <p>RAG 에이전트와 대화를 시작하세요.</p>
                        </div>
                    )}
                    {messages.map(msg => <MessageBubble key={msg.id} message={msg} />)}
                    {isLoading && (
                        <div className="flex justify-start">
                             <div className="flex-shrink-0 h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-indigo-400">AI</div>
                            <div className="ml-4 bg-slate-700 rounded-lg p-3 flex items-center">
                                <Spinner size="sm" />
                                <span className="ml-2 text-sm text-slate-400">생각 중...</span>
                            </div>
                        </div>
                    )}
                </CardContent>
                <div className="p-4 border-t border-slate-700 flex-shrink-0">
                    <div className="flex gap-2 mb-4">
                        <Button variant="secondary" size="sm" onClick={() => setShowHistory(!showHistory)}>
                            히스토리
                        </Button>
                        <Button variant="secondary" size="sm" onClick={saveChatHistory} disabled={messages.length === 0}>
                            저장
                        </Button>
                        <Button variant="secondary" size="sm" onClick={clearCurrentChat} disabled={messages.length === 0}>
                            초기화
                        </Button>
                    </div>
                    <form onSubmit={handleSubmit} className="flex gap-4 items-center">
                        <Input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="메시지 보내기..."
                            className="flex-grow"
                            disabled={isLoading}
                            autoFocus
                        />
                        <Button type="submit" isLoading={isLoading} disabled={!query.trim()} className="whitespace-nowrap flex-shrink-0">
                            전송
                        </Button>
                    </form>
                </div>
            </Card>
            
            {showHistory && (
                <Card className="mt-4 max-h-60 overflow-y-auto">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold text-white">대화 히스토리</h3>
                            <Button variant="danger" size="sm" onClick={() => {
                                VFS.clearChatHistory();
                                loadChatHistories();
                            }}>
                                전체 삭제
                            </Button>
                        </div>
                        {chatHistories.length === 0 ? (
                            <p className="text-slate-400 text-center py-4">저장된 대화가 없습니다.</p>
                        ) : (
                            <div className="space-y-2">
                                {chatHistories.map((history) => (
                                    <div key={history.id} className="flex items-center justify-between p-3 bg-slate-800 rounded-md hover:bg-slate-700 transition-colors">
                                        <div className="flex-grow cursor-pointer" onClick={() => loadChatSession(history.id)}>
                                            <h4 className="text-sm font-medium text-white truncate">{history.title}</h4>
                                            <p className="text-xs text-slate-400">
                                                {new Date(history.updated_at).toLocaleDateString('ko-KR', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </p>
                                        </div>
                                        <Button 
                                            variant="danger" 
                                            size="sm" 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                deleteChatSession(history.id);
                                            }}
                                        >
                                            삭제
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default AgentsPage;