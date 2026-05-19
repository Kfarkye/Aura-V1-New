import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { File, Folder, Search, FileText, Sheet, Presentation, ChevronRight, Home } from 'lucide-react';
import { Input } from '@/src/components/ui/input';

// Matches Google Drive API file resource
interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  iconLink?: string;
  modifiedTime?: string;
}

// Map MIME types to Lucide icons
const getIconForMimeType = (mimeType: string) => {
  if (mimeType.includes('folder')) return <Folder className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes('spreadsheet')) return <Sheet className="h-5 w-5 text-green-500" />;
  if (mimeType.includes('presentation')) return <Presentation className="h-5 w-5 text-orange-500" />;
  if (mimeType.includes('document')) return <FileText className="h-5 w-5 text-sky-500" />;
  return <File className="h-5 w-5 text-slate-500" />;
};

interface GoogleDriveExplorerProps {
  onFileSelect: (fileId: string, name: string) => void;
}

export default function GoogleDriveExplorer({ onFileSelect }: GoogleDriveExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation stack: initially just "root"
  const [pathStack, setPathStack] = useState<{id: string, name: string}[]>([
    { id: 'root', name: 'Drive' }
  ]);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [searchTerm]);

  useEffect(() => {
    const fetchDriveFiles = async () => {
      try {
        setIsLoading(true);
        const currentFolder = pathStack[pathStack.length - 1];
        
        const params = new URLSearchParams();
        if (debouncedSearch) {
          params.append('q', debouncedSearch);
        } else {
          params.append('folderId', currentFolder.id);
        }

        const response = await fetch(`/api/workspace/drive/list?${params.toString()}`);
        if (!response.ok) throw new Error('Failed to fetch Drive files');
        const data = await response.json();
        setFiles(data.files || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };
    fetchDriveFiles();
  }, [pathStack, debouncedSearch]);

  const handleFileClick = (file: DriveFile) => {
    if (file.mimeType.includes('folder')) {
      setPathStack(prev => [...prev, { id: file.id, name: file.name }]);
      setSearchTerm('');
    } else {
      onFileSelect(file.id, file.name);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index < pathStack.length - 1) {
      setPathStack(prev => prev.slice(0, index + 1));
      setSearchTerm('');
    }
  };

  return (
    <div 
      className="w-full max-w-lg h-[400px] rounded-[24px] flex flex-col overflow-hidden transition-all"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,248,248,0.90) 100%)',
        backdropFilter: 'blur(60px) saturate(180%)',
        WebkitBackdropFilter: 'blur(60px) saturate(180%)',
        boxShadow: '0 12px 40px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 1px rgba(255,255,255,0.9)',
        border: '1px solid rgba(0,0,0,0.08)',
      }}
    >
      <div className="p-4 border-b border-black/5 bg-white/40 flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1 overflow-x-auto whitespace-nowrap pb-1 no-scrollbar">
            {pathStack.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                {index > 0 && <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />}
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className={`flex items-center text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                    index === pathStack.length - 1 && !debouncedSearch
                      ? 'text-slate-900 bg-slate-200/50'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {index === 0 ? <Home className="h-3.5 w-3.5 mr-1" /> : null}
                  <span className="truncate max-w-[120px]">{crumb.name}</span>
                </button>
              </React.Fragment>
            ))}
            {debouncedSearch && (
              <>
                <ChevronRight className="h-3 w-3 text-slate-400 flex-shrink-0" />
                <span className="text-xs font-medium px-2 py-1 text-slate-900 bg-slate-200/50 rounded-md flex items-center">
                  Search results
                </span>
              </>
            )}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input 
              type="text"
              placeholder="Search Drive files..."
              className="pl-9 bg-white border-slate-200/60 focus-visible:ring-slate-300 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>
      <div className="flex-1 p-2 overflow-y-auto">
        {isLoading ? (
           <div className="flex justify-center items-center h-full text-sm text-slate-500">
             Loading Drive files...
           </div>
        ) : error ? (
           <div className="flex justify-center items-center h-full text-sm text-red-500">
             {error}
           </div>
        ) : (
          <ul className="space-y-1">
            {files.map(file => (
              <li 
                key={file.id} 
                onClick={() => handleFileClick(file)}
                className="flex items-center p-2 rounded-xl cursor-pointer hover:bg-slate-100 transition-colors group"
              >
                {getIconForMimeType(file.mimeType)}
                <span className="ml-3 text-sm font-medium text-slate-700 truncate group-hover:text-slate-900">{file.name}</span>
                {file.mimeType.includes('folder') && (
                  <ChevronRight className="ml-auto h-4 w-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
                )}
              </li>
            ))}
            {files.length === 0 && (
              <div className='text-center p-8 text-sm text-slate-500 flex flex-col items-center justify-center gap-2'>
                <Folder className="h-8 w-8 text-slate-300" />
                <span>{debouncedSearch ? `No files found for "${debouncedSearch}"` : "This folder is empty"}</span>
              </div>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

