'use client';

import React, { useState, useRef, useEffect } from 'react';
import FileExplorer from './FileExplorer'; // Import the FileExplorer component

interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  content?: string;
}

export default function ChatTerminal() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [editingFileContent, setEditingFileContent] = useState<FileEntry | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const userMessage = input.trim();

      // Handle internal commands
      if (userMessage === '/ls' || userMessage === '/explorer') {
        setShowFileExplorer(true);
        setMessages((prevMessages) => [...prevMessages, `> ${userMessage}`, 'System: Opening File Explorer.']);
        setInput('');
        return;
      }
      if (userMessage === '/chat') {
        setShowFileExplorer(false);
        setEditingFileContent(null);
        setMessages((prevMessages) => [...prevMessages, `> ${userMessage}`, 'System: Switching to Chat Mode.']);
        setInput('');
        return;
      }

      setMessages((prevMessages) => [...prevMessages, `> ${userMessage}`]);
      setInput('');
      setIsLoading(true);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ message: userMessage }),
        });

        if (!response.ok) {
          throw new Error(`Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        setMessages((prevMessages) => [...prevMessages, `AI: ${data.text}`]);
      } catch (error) {
        console.error('Failed to fetch AI response:', error);
        setMessages((prevMessages) => [...prevMessages, 'AI: Error getting response. Please try again.']);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleOpenFile = (file: FileEntry) => {
    setEditingFileContent(file);
    setShowFileExplorer(false); // Hide explorer when a file is opened
  };

  const handleCloseFile = () => {
    setEditingFileContent(null);
    setShowFileExplorer(true); // Show explorer again after closing file
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape' && (showFileExplorer || editingFileContent)) {
      e.preventDefault();
      if (editingFileContent) {
        handleCloseFile();
      } else if (showFileExplorer) {
        setShowFileExplorer(false);
        setMessages((prevMessages) => [...prevMessages, 'System: Exiting File Explorer.']);
      }
    }
  };


  return (
    <div className="flex flex-col h-screen bg-black text-red-500 font-mono p-4 terminal-scanlines">
      {/* Scanline overlay */}
      <div className="scanline-overlay"></div>

      {editingFileContent ? (
        <div className="flex-grow flex flex-col">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-red-700">
            <h2 className="text-lg font-bold">Editing: {editingFileContent.name}</h2>
            <button
              onClick={handleCloseFile}
              className="px-3 py-1 bg-red-800 text-white rounded hover:bg-red-700 transition-colors duration-200"
            >
              Close File
            </button>
          </div>
          <textarea
            className="flex-grow w-full bg-transparent border border-red-900 p-2 outline-none resize-none custom-scrollbar"
            value={editingFileContent.content}
            readOnly // For now, it's read-only. Will be a full IDE later.
          />
        </div>
      ) : showFileExplorer ? (
        <FileExplorer onOpenFile={handleOpenFile} />
      ) : (
        <div className="flex-grow overflow-y-auto mb-4 custom-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {messages.map((msg, index) => (
            <div key={index} className="whitespace-pre-wrap">
              {msg}
            </div>
          ))}
          {isLoading && <div className="text-red-700">AI: Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>
      )}

      <form onSubmit={handleSendMessage} className="flex mt-auto">
        <span className="text-red-500 pr-2">></span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-grow bg-transparent border-none outline-none text-red-500 placeholder-red-700"
          placeholder={isLoading ? "AI is thinking..." : "Type your command or message... (Type /ls for explorer)"}
          autoFocus
          disabled={isLoading}
        />
        <button
          type="submit"
          className="ml-2 px-4 py-2 bg-red-800 text-white rounded hover:bg-red-700 transition-colors duration-200"
          disabled={isLoading}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </form>

      <style jsx>{`
        .terminal-scanlines {
          position: relative;
          overflow: hidden;
        }
        .scanline-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            to bottom,
            rgba(0, 0, 0, 0) 0px,
            rgba(0, 0, 0, 0) 1px,
            rgba(255, 0, 0, 0.05) 1px,
            rgba(255, 0, 0, 0.05) 2px
          );
          pointer-events: none; /* Allows interaction with elements beneath */
          z-index: 1; /* Ensure scanlines are above content but below controls if needed */
        }
        /* Custom scrollbar for Webkit browsers */
        .custom-scrollbar::-webkit-scrollbar {
          display: none; /* Hide scrollbar for Chrome, Safari, Opera */
        }
      `}</style>
    </div>
  );
}
