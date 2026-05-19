import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { File, Folder, Search, FileCode, Github, FileText, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { Input } from '@/src/components/ui/input';
import { motion, AnimatePresence } from 'motion/react';

interface RepoFile {
  id: string;
  name: string;
  type: 'file' | 'dir';
  path: string;
  url?: string;
}

interface FileTreeNode {
  name: string;
  type: 'file' | 'dir';
  path: string;
  file?: RepoFile;
  children: { [key: string]: FileTreeNode };
}

const buildFileTree = (files: RepoFile[]): FileTreeNode => {
  const root: FileTreeNode = { name: 'root', type: 'dir', path: '', children: {} };
  
  files.forEach(file => {
    const parts = file.path.split('/');
    let current = root;
    
    parts.forEach((part, index) => {
      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          type: index === parts.length - 1 ? file.type : 'dir',
          path: parts.slice(0, index + 1).join('/'),
          children: {}
        };
      }
      current = current.children[part];
    });
    
    if (file.type === 'file') {
      current.file = file;
    }
  });
  
  return root;
};

const getIconForType = (type: string, name: string, isOpen?: boolean) => {
  if (type === 'dir') return isOpen ? <FolderOpen className="h-4 w-4 text-blue-500" /> : <Folder className="h-4 w-4 text-blue-500" />;
  if (name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.js') || name.endsWith('.jsx')) {
    return <FileCode className="h-4 w-4 text-yellow-500" />;
  }
  if (name.endsWith('.md') || name.endsWith('.txt')) {
    return <FileText className="h-4 w-4 text-slate-500" />;
  }
  return <File className="h-4 w-4 text-slate-500" />;
};

interface FileTreeNodeComponentProps {
  node: FileTreeNode;
  onFileSelect: (file: RepoFile) => void;
  level?: number;
}

const FileTreeNodeComponent = ({ node, onFileSelect, level = 0 }: FileTreeNodeComponentProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const isDir = node.type === 'dir';

  // Sort children: directories first, then files alphabetically
  const children = Object.values(node.children).sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  if (node.name === 'root') {
    return (
      <ul className="space-y-[1px]">
        {children.map(child => (
          <FileTreeNodeComponent key={child.path} node={child} onFileSelect={onFileSelect} level={0} />
        ))}
      </ul>
    );
  }

  return (
    <li className="w-full">
      <div 
        onClick={() => {
          if (isDir) {
            setIsOpen(!isOpen);
          } else if (node.file) {
            onFileSelect(node.file);
          }
        }}
        className="flex items-center py-1.5 px-2 rounded-lg cursor-pointer hover:bg-slate-100/80 transition-colors group text-sm select-none"
        style={{ paddingLeft: `${level * 16 + 8}px` }}
      >
        <span className="w-4 h-4 flex items-center justify-center mr-1">
          {isDir && (
            <ChevronRight className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
          )}
        </span>
        <span className="mr-2.5">
          {getIconForType(node.type, node.name, isOpen)}
        </span>
        <span className="font-medium text-slate-700 truncate group-hover:text-slate-900 tracking-tight">{node.name}</span>
      </div>
      
      <AnimatePresence initial={false}>
        {isDir && isOpen && children.length > 0 && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            {children.map(child => (
              <FileTreeNodeComponent key={child.path} node={child} onFileSelect={onFileSelect} level={level + 1} />
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </li>
  );
};

interface RepoFileExplorerProps {
  onFileSelect: (file: RepoFile, repoOwner: string, repoName: string) => void;
}

export default function RepoFileExplorer({ onFileSelect }: RepoFileExplorerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [files, setFiles] = useState<RepoFile[]>([]);
  const [repos, setRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRepoMenuOpen, setIsRepoMenuOpen] = useState(false);

  useEffect(() => {
    const fetchRepos = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/fleet/repos');
        if (!res.ok) throw new Error('Failed to fetch repositories');
        const data = await res.json();
        setRepos(data.repos || []);
        if (data.repos && data.repos.length > 0) {
          setSelectedRepo(data.repos[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch repositories');
        setIsLoading(false);
      }
    };
    fetchRepos();
  }, []);

  useEffect(() => {
    if (!selectedRepo) return;
    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        const res = await fetch('/api/github/repos/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner: selectedRepo.github.owner, repo: selectedRepo.github.repo })
        });
        if (!res.ok) throw new Error('Failed to sync repository');
        const data = await res.json();
        const treeFiles = (data.tree || []).map((t: any) => ({
          id: t.sha,
          name: t.path.split('/').pop() || t.path,
          type: t.type === 'tree' ? 'dir' : 'file',
          path: t.path
        }));
        setFiles(treeFiles);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to sync repository');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFiles();
  }, [selectedRepo]);

  const fileTree = useMemo(() => {
    const filteredFiles = searchTerm
      ? files.filter(f => f.path.toLowerCase().includes(searchTerm.toLowerCase()))
      : files;
    return buildFileTree(filteredFiles);
  }, [files, searchTerm]);

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
        <div className="flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5 text-slate-700" />
            <h3 className="text-sm font-semibold text-slate-900 tracking-tight">Repository</h3>
          </div>
          {repos.length > 0 && (
            <button
              onClick={() => setIsRepoMenuOpen(!isRepoMenuOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200/60 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="truncate max-w-[120px]">{selectedRepo?.name || 'Select Repo'}</span>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>
          )}
          {isRepoMenuOpen && repos.length > 0 && (
            <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200/60 shadow-lg rounded-xl overflow-hidden z-50">
              {repos.map(repo => (
                <button
                  key={repo.id}
                  onClick={() => { setSelectedRepo(repo); setIsRepoMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  {repo.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            type="text"
            placeholder="Search repository files..."
            className="pl-9 bg-white border-slate-200/60 focus-visible:ring-slate-300"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>
      <div className="flex-1 p-2 overflow-y-auto">
        {isLoading ? (
           <div className="flex justify-center items-center h-full text-sm text-slate-500">
             Loading repository...
           </div>
        ) : error ? (
           <div className="flex justify-center items-center h-full text-sm text-red-500">
             {error}
           </div>
        ) : (
          <div className="pr-2">
            {Object.keys(fileTree.children).length > 0 ? (
              <FileTreeNodeComponent 
                node={fileTree} 
                onFileSelect={(file) => selectedRepo && onFileSelect(file, selectedRepo.github.owner, selectedRepo.github.repo)} 
              />
            ) : (
              <div className='text-center p-8 text-sm text-slate-500'>
                  No files found.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
