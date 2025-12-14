'use client';

import React, { useState } from 'react';

interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  content?: string; // For IDE integration later
}

interface FileExplorerProps {
  files: FileEntry[];
  onOpenFile: (file: FileEntry) => void;
}

export default function FileExplorer({ files, onOpenFile }: FileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string>('/');

  const navigateTo = (path: string) => {
    setCurrentPath(path);
    // In a real scenario, you would fetch files for the given path
    // For now, we'll just show the same dummy files.
  };

  const handleEntryClick = (entry: FileEntry) => {
    if (entry.type === 'directory') {
      navigateTo(currentPath === '/' ? `/${entry.name}` : `${currentPath}/${entry.name}`);
    } else {
      onOpenFile(entry);
    }
  };

  // Basic path filtering for now.
  // In a real app, this would be more sophisticated.
  const filteredFiles = files.filter(file => {
    // If currentPath is '/', show all top-level files/directories
    if (currentPath === '/') {
      return !file.name.includes('/');
    }
    // Otherwise, show files/directories within the current path
    const pathPrefix = currentPath.substring(1) + '/'; // e.g., 'config/'
    return file.name.startsWith(pathPrefix) && !file.name.substring(pathPrefix.length).includes('/');
  }).map(file => {
    // Display only the file/directory name relative to the current path
    if (currentPath === '/') {
      return { ...file, displayName: file.name };
    }
    return { ...file, displayName: file.name.substring(currentPath.substring(1).length + 1) };
  });


  return (
    <div className="w-full h-full flex flex-col p-2 bg-black text-red-500 border border-red-900 overflow-auto custom-scrollbar">
      <div className="flex items-center mb-2">
        <span className="text-red-700 pr-2">Path:</span>
        <span className="flex-grow">{currentPath}</span>
        {currentPath !== '/' && (
          <button
            onClick={() => navigateTo('/')}
            className="text-red-500 hover:text-red-300 ml-2 px-2 py-1 border border-red-700 rounded text-sm"
          >
            Home
          </button>
        )}
      </div>
      <div className="flex-grow">
        {filteredFiles.map((entry, index) => (
          <div
            key={index}
            className="flex items-center cursor-pointer hover:bg-red-900 hover:text-white py-0.5"
            onClick={() => handleEntryClick(entry)}
          >
            {entry.type === 'directory' ? (
              <span className="mr-2">[DIR]</span>
            ) : (
              <span className="mr-2">[FIL]</span>
            )}
            {entry.displayName}
          </div>
        ))}
      </div>
    </div>
  );
}
