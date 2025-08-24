
import React, { useState, useEffect, useCallback } from 'react';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import FileIcon from '../icons/FileIcon';
import UploadIcon from '../icons/UploadIcon';
import { getDocuments, createQADataset, getQADataJson, clearAndRecreateQADataset, uploadDocument, deleteDocument } from '../../services/api';
import { Document } from '../../types';

const FileUploadArea: React.FC<{ onUpload: (files: FileList) => void, disabled: boolean }> = ({ onUpload, disabled }) => {
    const [isDragging, setIsDragging] = useState(false);

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if(!disabled) setIsDragging(true);
    };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if(!disabled) setIsDragging(false);
    };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        if (disabled) return;
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            onUpload(e.dataTransfer.files);
            e.dataTransfer.clearData();
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            onUpload(e.target.files);
        }
    };

    return (
        <div 
            onDrop={handleDrop} 
            onDragOver={handleDragOver} 
            onDragEnter={handleDragEnter} 
            onDragLeave={handleDragLeave}
            className={`flex justify-center items-center w-full px-6 py-10 border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-indigo-500 bg-slate-800' : 'border-slate-600'} ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
        >
            <div className="text-center">
                <UploadIcon className="mx-auto h-12 w-12 text-slate-400" />
                <p className="mt-1 text-sm text-slate-400">
                    <label htmlFor="file-upload" className={`relative font-medium text-indigo-400 hover:text-indigo-500 focus-within:outline-none ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                        <span>파일 업로드</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} disabled={disabled} />
                    </label>
                    {' '}또는 파일을 끌어다 놓으세요
                </p>
                <p className="text-xs text-slate-500">HWP, DOCX, PPTX, PDF 등</p>
            </div>
        </div>
    );
};

const AdminPage: React.FC = () => {
  const [allDocs, setAllDocs] = useState<Document[]>([]);
  const [qaData, setQaData] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingDocId, setDeletingDocId] = useState<string | null>(null);
  const [progressMessage, setProgressMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAllFiles, setShowAllFiles] = useState(false);
  const [processedDocIds, setProcessedDocIds] = useState<string[]>([]);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [docs, json] = await Promise.all([getDocuments(), getQADataJson()]);
      setAllDocs(docs);
      setQaData(json);
      
      // data.json에서 처리된 문서 ID 추출
      try {
        const parsedQAData = JSON.parse(json);
        if (parsedQAData.documents && Array.isArray(parsedQAData.documents)) {
          const docIds = parsedQAData.documents.map((doc: any) => doc.doc_id);
          setProcessedDocIds(docIds);
        }
      } catch (parseError) {
        console.warn("QA 데이터 파싱 실패:", parseError);
        setProcessedDocIds([]);
      }
    } catch (error: any) {
      console.error("Failed to load admin data", error);
      setError(`데이터 로딩 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpload = useCallback(async (files: FileList) => {
    setIsUploading(true);
    setError(null);
    setSuccess(null);
    
    const fileArray = Array.from(files);
    let successCount = 0;
    let failedFiles: string[] = [];
    
    try {
        for (const file of fileArray) {
            try {
                await uploadDocument(file);
                successCount++;
            } catch (error: any) {
                console.error(`Upload failed for ${file.name}:`, error);
                failedFiles.push(`${file.name}: ${error.message}`);
            }
        }
        
        if (successCount > 0) {
            setSuccess(`${successCount}개 파일이 성공적으로 업로드되었습니다.`);
        }
        
        if (failedFiles.length > 0) {
            setError(`업로드 실패한 파일들:\n${failedFiles.join('\n')}`);
        }
        
    } catch (error: any) {
        console.error("Upload process failed", error);
        setError(`업로드 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
        setIsUploading(false);
        await fetchData();
    }
  }, [fetchData]);

  const handleDelete = useCallback(async (docId: string, filename: string) => {
    if (!confirm(`'${filename}' 문서를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없으며, 관련된 QA 데이터도 함께 삭제됩니다.`)) {
      return;
    }

    setDeletingDocId(docId);
    setError(null);
    setSuccess(null);
    
    try {
      await deleteDocument(docId);
      setSuccess(`'${filename}' 문서가 성공적으로 삭제되었습니다.`);
      await fetchData();
    } catch (error: any) {
      console.error("Failed to delete document", error);
      setError(`문서 삭제 실패: ${error.message || '알 수 없는 오류가 발생했습니다.'}`);
    } finally {
      setDeletingDocId(null);
    }
  }, [fetchData]);

  const handleCreateDataset = async (clearFirst: boolean) => {
    setIsProcessing(true);
    setError(null);
    setSuccess(null);
    setProgressMessage('QA 데이터셋 생성을 시작합니다...');
    
    try {
      const action = clearFirst ? clearAndRecreateQADataset : createQADataset;
      const result = await action((message) => {
        setProgressMessage(message);
      });
      
      setSuccess(`데이터셋 생성 완료! ${result.count}개의 청크가 생성되었습니다.`);
      setProgressMessage('');
    } catch (error: any) {
      console.error("Failed to create QA dataset", error);
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다.';
      setError(`QA 데이터셋 생성 실패: ${errorMessage}`);
      setProgressMessage('');
      
      if (errorMessage.includes('API 키')) {
        setError('Gemini API 키가 설정되지 않았습니다. .env 파일에 VITE_GEMINI_API_KEY를 설정해주세요.');
      }
    } finally {
      setIsProcessing(false);
      await fetchData();
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-white">관리자 대시보드</h1>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-200 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Success Alert */}
      {success && (
        <div className="bg-green-900/50 border border-green-700 text-green-200 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-white">문서 업로드</h2>
        </CardHeader>
        <CardContent>
            <FileUploadArea onUpload={handleUpload} disabled={isUploading} />
            {isUploading && (
                <div className="mt-4 flex items-center justify-center space-x-2 text-slate-300">
                    <Spinner size="sm" />
                    <span>파일을 업로드하는 중...</span>
                </div>
            )}
        </CardContent>
        <CardContent className="border-t border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-white">
              {showAllFiles ? '전체 문서 목록' : '업로드된 문서 목록'}
            </h3>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => setShowAllFiles(!showAllFiles)}
            >
              {showAllFiles ? '미처리 파일만 보기' : '전체 파일 목록 보기'}
            </Button>
          </div>
          
          {(() => {
            const displayDocs = showAllFiles ? allDocs : allDocs.filter(doc => !processedDocIds.includes(doc.doc_id));
            
            return displayDocs.length === 0 ? (
              <p className="text-slate-500 text-center py-8">
                {showAllFiles 
                  ? "업로드된 문서가 없습니다. 위의 업로드 영역에서 문서를 추가하세요."
                  : "처리되지 않은 문서가 없습니다. 모든 문서가 data.json에 저장되었습니다."
                }
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-800">
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">파일명</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">크기</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">업로드일</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">상태</th>
                      <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">삭제</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                    {displayDocs.map((doc) => {
                      const isProcessed = processedDocIds.includes(doc.doc_id);
                      return (
                        <tr key={doc.doc_id}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 flex items-center">
                            <FileIcon className="h-5 w-5 mr-3 text-slate-400" />
                            {doc.filename}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300">{(doc.size / (1024 * 1024)).toFixed(2)} MB</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300">{new Date(doc.created_at).toLocaleString('ko-KR')}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            {isProcessed ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                처리완료
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                대기중
                              </span>
                            )}
                          </td>
                          <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={() => handleDelete(doc.doc_id, doc.filename)}
                              isLoading={deletingDocId === doc.doc_id}
                              disabled={deletingDocId !== null || isUploading || isProcessing}
                            >
                              {deletingDocId === doc.doc_id ? '삭제 중...' : '삭제'}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-white">QA 데이터셋 관리</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-400">
            업로드된 문서를 처리하여 검색 및 에이전트 답변에 사용할 QA 데이터셋(data.json)을 생성하거나 업데이트합니다.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button onClick={() => handleCreateDataset(false)} isLoading={isProcessing} disabled={isProcessing}>
              새 문서로 데이터셋 업데이트
            </Button>
            <Button variant="secondary" onClick={() => handleCreateDataset(true)} isLoading={isProcessing} disabled={isProcessing}>
              전체 지우고 다시 만들기
            </Button>
          </div>
          {(isProcessing || progressMessage) && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-slate-700/50 rounded-md">
              {isProcessing && <Spinner size="sm" />}
              <p className="text-sm text-indigo-300">{progressMessage}</p>
            </div>
          )}
        </CardContent>
        <CardContent className="border-t border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-2">생성된 QA 데이터 (data.json)</h3>
          <textarea
            readOnly
            value={qaData}
            className="w-full h-64 p-2 font-mono text-xs bg-slate-900 border border-slate-600 rounded-md resize-y"
            placeholder="QA 데이터셋을 생성하면 내용이 여기에 표시됩니다."
          />
        </CardContent>
      </Card>

    </div>
  );
};

export default AdminPage;
