
import React, { useState, useCallback, useEffect } from 'react';
import { getDocuments } from '../../services/api';
import { Document, DocumentStatus } from '../../types';
import Card, { CardContent, CardHeader } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import Spinner from '../ui/Spinner';
import FileIcon from '../icons/FileIcon';

const DocumentStatusBadge: React.FC<{ status: DocumentStatus }> = ({ status }) => {
  switch (status) {
    case DocumentStatus.READY:
      return <Badge variant="success">준비됨</Badge>;
    case DocumentStatus.PROCESSING:
      return <Badge variant="info">처리중</Badge>;
    case DocumentStatus.QUEUED:
      return <Badge variant="warning">대기중</Badge>;
    case DocumentStatus.ERROR:
      return <Badge variant="danger">오류</Badge>;
    default:
      return <Badge>알 수 없음</Badge>;
  }
};


const DatasetPage: React.FC<{onViewDocument: (docId: string) => void}> = ({ onViewDocument }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    setIsLoading(true);
    try {
      const docs = await getDocuments(5);
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to fetch documents", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  return (
    <div className="p-8 space-y-8">
      <h1 className="text-3xl font-bold text-white">데이터셋</h1>
      
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold text-white">최근 원본 파일 (최대 5개)</h2>
        </CardHeader>
        <CardContent>
          {isLoading && documents.length === 0 ? (
            <div className="flex justify-center items-center h-40">
              <Spinner />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800">
                  <tr>
                    <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-white sm:pl-6">파일명</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">상태</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">크기</th>
                    <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-white">생성일</th>
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">보기</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700 bg-slate-900/50">
                  {documents.map((doc) => (
                    <tr key={doc.doc_id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-white sm:pl-6 flex items-center">
                        <FileIcon className="h-5 w-5 mr-3 text-slate-400" />
                        {doc.filename}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300"><DocumentStatusBadge status={doc.status} /></td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300">{(doc.size / (1024*1024)).toFixed(2)} MB</td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-slate-300">{new Date(doc.created_at).toLocaleString('ko-KR')}</td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <Button variant="ghost" size="sm" onClick={() => onViewDocument(doc.doc_id)} disabled={doc.status !== 'ready'}>보기</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DatasetPage;
