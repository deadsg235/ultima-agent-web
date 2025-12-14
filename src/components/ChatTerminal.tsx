'use client';

import React, { useState, useRef, useEffect } from 'react';
import FileExplorer from './FileExplorer'; // Import the FileExplorer component
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'; // Import the WalletMultiButton
import { loadMojoModule, predictWithMojo, greetWithMojo } from '../lib/mojoWasm'; // Import Mojo WASM utilities

interface FileEntry {
  name: string;
  type: 'file' | 'directory';
  content?: string; // For IDE integration later
}

export default function ChatTerminal() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFileExplorer, setShowFileExplorer] = useState(false);
  const [editingFileContent, setEditingFileContent] = useState<FileEntry | null>(null);
  const [editedFileContent, setEditedFileContent] = useState<string>('');
  const [mojoLoaded, setMojoLoaded] = useState(false);
  const [currentSystemPrompt, setCurrentSystemPrompt] = useState<string>('');


  // Initial dummy file system
  const [files, setFiles] = useState<FileEntry[]>([
    { name: 'ata_tool_1.js', type: 'file', content: '// This is ATA Tool 1\nconsole.log("Hello from ATA Tool 1");' },
    { name: 'code_upgrade_a.ts', type: 'file', content: 'type UpgradeA = { version: string; };\nconst upgrade: UpgradeA = { version: "1.0.0" };' },
    { name: 'config', type: 'directory' },
    { name: 'config/settings.json', type: 'file', content: '{\n  "theme": "dark",\n  "fontSize": 14\n}' },
    { name: 'my_script.py', type: 'file', content: '# Python script\nprint("Hello, Python!")' },
    { name: 'docs', type: 'directory' },
    { name: 'docs/README.md', type: 'file', content: '# Readme\nThis is a dummy readme file.' },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load Mojo WASM module once
  useEffect(() => {
    const loadWasm = async () => {
      const module = await loadMojoModule();
      if (module) {
        setMojoLoaded(true);
        setMessages((prevMessages) => [...prevMessages, 'System: Mojo WASM module loaded.']);
      } else {
        setMessages((prevMessages) => [...prevMessages, 'System: Failed to load Mojo WASM module.']);
      }
    };
    loadWasm();

    // Fetch initial system prompt
    const fetchSystemPrompt = async () => {
      try {
        const response = await fetch('/api/update-prompt'); // GET request to fetch current prompt
        if (response.ok) {
          const data = await response.json();
          setCurrentSystemPrompt(data.prompt);
          setMessages((prevMessages) => [...prevMessages, `System Prompt: ${data.prompt}`]);
        } else {
          setMessages((prevMessages) => [...prevMessages, 'System: Failed to fetch initial system prompt.']);
        }
      } catch (error) {
        console.error('Error fetching initial system prompt:', error);
        setMessages((prevMessages) => [...prevMessages, 'System: Error fetching initial system prompt.']);
      }
    };
    fetchSystemPrompt();

  }, []); // Empty dependency array means this runs once on mount

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const userMessage = input.trim();
      setMessages((prevMessages) => [...prevMessages, `> ${userMessage}`]);
      setInput('');
      setIsLoading(true);

      // Handle internal commands
      if (userMessage === '/ls' || userMessage === '/explorer') {
        setShowFileExplorer(true);
        setEditingFileContent(null); // Ensure no file is being edited
        setMessages((prevMessages) => [...prevMessages, 'System: Opening File Explorer.']);
        setIsLoading(false);
        return;
      }
      if (userMessage === '/chat') {
        setShowFileExplorer(false);
        setEditingFileContent(null);
        setMessages((prevMessages) => [...prevMessages, 'System: Switching to Chat Mode.']);
        setIsLoading(false);
        return;
      }
      if (userMessage.startsWith('/predict ')) {
        if (!mojoLoaded) {
          setMessages((prevMessages) => [...prevMessages, 'System: Mojo WASM module not loaded. Cannot predict.']);
          setIsLoading(false);
          return;
        }
        const valueStr = userMessage.split(' ')[1];
        const value = parseFloat(valueStr);
        if (!isNaN(value)) {
          const prediction = await predictWithMojo(value);
          setMessages((prevMessages) => [...prevMessages, `Mojo Prediction: ${prediction}`]);
        } else {
          setMessages((prevMessages) => [...prevMessages, 'System: Invalid number for prediction. Usage: /predict <number>']);
        }
        setIsLoading(false);
        return;
      }
      if (userMessage.startsWith('/mojo ')) {
        if (!mojoLoaded) {
          setMessages((prevMessages) => [...prevMessages, 'System: Mojo WASM module not loaded. Cannot greet.']);
          setIsLoading(false);
          return;
        }
        const name = userMessage.substring(userMessage.indexOf(' ') + 1);
        const greeting = await greetWithMojo(name);
        setMessages((prevMessages) => [...prevMessages, `Mojo Greet: ${greeting}`]);
        setIsLoading(false);
        return;
      }
      if (userMessage.startsWith('/update_prompt ')) {
        const newPrompt = userMessage.substring('/update_prompt '.length).trim();
        if (newPrompt) {
          try {
            const response = await fetch('/api/update-prompt', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ newPromptContent: newPrompt }),
            });
            const data = await response.json();
            if (response.ok) {
              setMessages((prevMessages) => [...prevMessages, `System: ${data.message}`]);
              setMessages((prevMessages) => [...prevMessages, `Proposed: ${data.proposedContent}`]);
              setMessages((prevMessages) => [...prevMessages, `Current (before PR merge): ${data.currentLivePrompt}`]);
              setCurrentSystemPrompt(newPrompt); // Optimistically update if PR is "created"
            } else {
              setMessages((prevMessages) => [...prevMessages, `System Error: ${data.error}`]);
            }
          } catch (error) {
            console.error('Error updating system prompt:', error);
            setMessages((prevMessages) => [...prevMessages, 'System Error: Failed to communicate with update prompt API.']);
          }
        } else {
          setMessages((prevMessages) => [...prevMessages, 'System: Usage: /update_prompt <new prompt content>']);
        }
        setIsLoading(false);
        return;
      }


      // Default AI message handling
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
    setEditedFileContent(file.content || ''); // Initialize edited content with file's current content
    setShowFileExplorer(false); // Hide explorer when a file is opened
  };

  const handleCloseFile = () => {
    setEditingFileContent(null);
    setEditedFileContent('');
    setShowFileExplorer(true); // Show explorer again after closing file
  };

  const handleSaveFile = () => {
    if (editingFileContent) {
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.name === editingFileContent.name
            ? { ...file, content: editedFileContent }
            : file
        )
      );
      setMessages((prevMessages) => [...prevMessages, `System: File '${editingFileContent.name}' saved.`]);
      handleCloseFile(); // Close editor after saving
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (e.key === 'Escape') {
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

      <div className="absolute top-4 right-4 z-10">
        <WalletMultiButton />
      </div>

      {editingFileContent ? (
        <div className="flex-grow flex flex-col">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-red-700">
            <h2 className="text-lg font-bold">Editing: {editingFileContent.name}</h2>
            <div className="flex space-x-2">
              <button
                onClick={handleSaveFile}
                className="px-3 py-1 bg-red-800 text-white rounded hover:bg-red-700 transition-colors duration-200"
              >
                Save File
              </button>
              <button
                onClick={handleCloseFile}
                className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-500 transition-colors duration-200"
              >
                Close File
              </button>
            </div>
          </div>
          <textarea
            className="flex-grow w-full bg-transparent border border-red-900 p-2 outline-none resize-none custom-scrollbar"
            value={editedFileContent}
            onChange={(e) => setEditedFileContent(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            spellCheck="false"
          />
        </div>
      ) : showFileExplorer ? (
        <FileExplorer files={files} onOpenFile={handleOpenFile} />
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
                  <span className="text-red-500 pr-2">{`>>`}</span>        <input
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
