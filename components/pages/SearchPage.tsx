import React, { useState, useEffect } from 'react';
import { searchRAG, downloadDocument } from '../../services/api';
import { QAResponse, Citation } from '../../types';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Spinner from '../ui/Spinner';
import FileIcon from '../icons/FileIcon';

const CitationCard: React.FC<{ citation: Citation; onDownload: (docId: string) => Promise<void>; isDownloading: string | null }> = ({ citation, onDownload, isDownloading }) => {
    
    const handleDownloadClick = () => {
        onDownload(citation.doc_id);
    };

    const isCurrentDownload = isDownloading === citation.doc_id;

    return (
        <Card className="bg-slate-800/50 hover:bg-slate-800/80 transition-colors flex flex-col justify-between">
            <CardContent className="p-4">
                <p className="text-sm text-slate-200 whitespace-pre-wrap">{citation.quote}</p>
            </CardContent>
            <div className="p-3 border-t border-slate-700/50 flex items-center justify-between gap-4">
                <div className="flex items-center text-xs text-slate-400 min-w-0">
                    <FileIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate" title={citation.filename}>{citation.filename}</span>
                </div>
                <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={handleDownloadClick}
                    isLoading={isCurrentDownload}
                    disabled={isDownloading !== null}
                >
                    문서 다운로드
                </Button>
            </div>
        </Card>
    );
};

const SkeletonLoader: React.FC = () => (
    <div className="space-y-6 animate-pulse">
        <div className="bg-slate-700 h-8 w-3/4 rounded-md"></div>
        <div className="space-y-2">
            <div className="bg-slate-700 h-4 w-full rounded-md"></div>
            <div className="bg-slate-700 h-4 w-full rounded-md"></div>
            <div className="bg-slate-700 h-4 w-5/6 rounded-md"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="bg-slate-800 rounded-lg h-48"></div>
            <div className="bg-slate-800 rounded-lg h-48"></div>
        </div>
    </div>
);


const SearchPage: React.FC = () => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<QAResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);
    const [searchHistory, setSearchHistory] = useState<Array<{query: string, answer: string, timestamp: Date}>>([]);

    // 컴포넌트 마운트 시 localStorage에서 영구 히스토리 자동 로드
    useEffect(() => {
        const savedHistory = localStorage.getItem('permanentSearchHistory');
        if (savedHistory) {
            try {
                const parsedHistory = JSON.parse(savedHistory);
                const validHistory = parsedHistory.map((item: any) => ({
                    ...item,
                    timestamp: new Date(item.timestamp)
                }));
                setPermanentHistory(validHistory);
            } catch (err) {
                console.error('영구 히스토리 로드 실패:', err);
            }
        }
    }, []);

    // 임시 히스토리를 영구 히스토리에서 분리하기 위해 상태를 따로 관리
    const [permanentHistory, setPermanentHistory] = useState<Array<{query: string, answer: string, timestamp: Date}>>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResponse(null);

        try {
            const result = await searchRAG(query);
            setResponse(result);
            
            // Add to history
            setSearchHistory(prev => [{
                query: query,
                answer: result.answer,
                timestamp: new Date()
            }, ...prev]);
        } catch (err) {
            setError('답변을 가져오는 데 실패했습니다. 다시 시도해 주세요.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownload = async (docId: string) => {
        if (isDownloading) return;
        setIsDownloading(docId);
        try {
            await downloadDocument(docId);
        } catch (err) {
            setError(`문서(ID: ${docId}) 다운로드에 실패했습니다.`);
            console.error(err);
        } finally {
            setIsDownloading(null);
        }
    };

    const clearHistory = () => {
        setSearchHistory([]);
    };

    const saveHistory = () => {
        // 현재 세션의 임시 히스토리를 영구 히스토리에 추가
        const combinedHistory = [...searchHistory, ...permanentHistory];
        
        // 중복 제거 (timestamp로 구분)
        const uniqueHistory = combinedHistory.filter((item, index, self) =>
            index === self.findIndex(h => h.timestamp.getTime() === item.timestamp.getTime())
        );
        
        // 시간순 정렬 (최신순)
        uniqueHistory.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        
        // localStorage에 영구 저장
        localStorage.setItem('permanentSearchHistory', JSON.stringify(uniqueHistory));
        setPermanentHistory(uniqueHistory);
        
        // JSON 파일로도 다운로드
        const dataStr = JSON.stringify(uniqueHistory, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `search_history_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        // 현재 세션 히스토리 초기화 (영구 저장되었으므로)
        setSearchHistory([]);
    };

    const deleteHistoryItem = (indexToDelete: number) => {
        const newHistory = searchHistory.filter((_, index) => index !== indexToDelete);
        setSearchHistory(newHistory);
    };

    const loadHistory = async () => {
        try {
            // localStorage에서 영구 히스토리 불러와서 현재 세션에 표시
            if (permanentHistory.length > 0) {
                setSearchHistory(permanentHistory);
            } else {
                setError('저장된 히스토리가 없습니다.');
            }
        } catch (err) {
            setError('히스토리를 불러오는데 실패했습니다.');
            console.error(err);
        }
    };

    return (
        <div className="flex h-full">
            <div className="flex-1 p-8">
                <h1 className="text-3xl font-bold text-white mb-6">HMK홀딩스 지식을 검색하세요</h1>
                <form onSubmit={handleSubmit} className="flex gap-4 items-center">
                    <Input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="HMK홀딩스 지식을 검색해 주세요. 지식과 텍스트 파일을 받으실 수 있습니다."
                        className="flex-grow"
                        disabled={isLoading}
                    />
                    <Button type="submit" isLoading={isLoading} className="whitespace-nowrap">
                        검색
                    </Button>
                </form>

                <div className="mt-8">
                    {isLoading && <SkeletonLoader />}
                    {error && <p className="text-red-400">{error}</p>}
                    {response && (
                        <Card>
                            <CardHeader>
                                <h2 className="text-xl font-semibold text-white">답변</h2>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{response.answer}</p>
                                {response.citations.length > 0 && (
                                    <>
                                        <h3 className="text-lg font-semibold text-white mt-8 mb-4">관련 청크</h3>
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                            {response.citations.map((citation, index) => (
                                                <CitationCard 
                                                    key={index} 
                                                    citation={citation} 
                                                    onDownload={handleDownload}
                                                    isDownloading={isDownloading}
                                                />
                                            ))}
                                        </div>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                     {!isLoading && !response && !error && (
                        <div className="text-center py-20">
                            <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                            <h3 className="mt-2 text-sm font-medium text-slate-300">결과는 여기에 표시됩니다</h3>
                            <p className="mt-1 text-sm text-slate-500">시작하려면 질문을 입력하세요.</p>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Right Navigation Bar */}
            <aside className="w-80 flex-shrink-0 bg-slate-800/30 border-l border-slate-700 p-4">
                <div className="flex flex-col h-full">
                    <div className="mb-6">
                        <h2 className="text-lg font-semibold text-white mb-4">히스토리 관리</h2>
                        <div className="space-y-2">
                            <Button 
                                variant="secondary" 
                                onClick={saveHistory}
                                disabled={searchHistory.length === 0}
                                className="w-full"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                                </svg>
                                히스토리 저장
                            </Button>
                            <Button 
                                variant="secondary" 
                                onClick={loadHistory}
                                className="w-full"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                                </svg>
                                히스토리 불러오기
                            </Button>
                            <Button 
                                variant="secondary" 
                                onClick={clearHistory}
                                disabled={searchHistory.length === 0}
                                className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                                히스토리 초기화
                            </Button>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-hidden">
                        <h3 className="text-md font-medium text-slate-300 mb-3">검색 히스토리 ({searchHistory.length})</h3>
                        <div className="space-y-3 overflow-y-auto h-full pr-2">
                            {searchHistory.map((item, index) => (
                                <div key={index} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/50 relative group">
                                    <button
                                        onClick={() => deleteHistoryItem(index)}
                                        className="absolute top-2 right-2 w-5 h-5 rounded-full bg-red-500/80 hover:bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="삭제"
                                    >
                                        ×
                                    </button>
                                    <div className="text-xs text-slate-400 mb-2">
                                        {item.timestamp.toLocaleString('ko-KR')}
                                    </div>
                                    <div className="text-sm text-slate-200 font-medium mb-2 line-clamp-2">
                                        {item.query}
                                    </div>
                                    <div className="text-xs text-slate-400 line-clamp-3">
                                        {item.answer}
                                    </div>
                                </div>
                            ))}
                            {searchHistory.length === 0 && (
                                <div className="text-center py-8">
                                    <svg className="mx-auto h-8 w-8 text-slate-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
                                    </svg>
                                    <p className="text-sm text-slate-500">아직 검색 기록이 없습니다</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
        </div>
    );
};

export default SearchPage;