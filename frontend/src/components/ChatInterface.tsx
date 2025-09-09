import React, { useState, useRef, useEffect } from 'react';
import Navigation from './Navigation';
import { Send, Paperclip, Mic, Bot, User, Sparkles } from 'lucide-react';

interface Message {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
  attachments?: string[];
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'bot',
      content: "Hello! I'm your AI study assistant. I can help you create study plans, generate quizzes from your materials, set reminders, and answer questions about your subjects. What would you like to work on today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingContent, setTypingContent] = useState(""); // for animation
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, typingContent]);

  // Animate bot reply line by line
  const animateBotReply = (fullText: string) => {
    const lines = fullText.split("\n"); // split by newline
    let i = 0;
    setTypingContent("");
    setIsTyping(true);

    const interval = setInterval(() => {
      setTypingContent(prev => prev + (i > 0 ? "\n" : "") + lines[i]);
      i++;
      if (i >= lines.length) {
        clearInterval(interval);
        const botMessage: Message = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: fullText,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, botMessage]);
        setTypingContent("");
        setIsTyping(false);
      }
    }, 300); // adjust speed if needed
  };

  const handleSendMessage = async () => {
  if (!inputValue.trim()) return;

  const userMessage: Message = {
    id: Date.now().toString(),
    type: 'user',
    content: inputValue,
    timestamp: new Date()
  };

  setMessages(prev => [...prev, userMessage]);
  setInputValue('');
  setIsTyping(true);

  try {
    // Call your backend
    const res = await fetch("http://127.0.0.1:5001/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userMessage.content })
    });
    const data = await res.json();
    let botReply = data.reply || "";

    // Remove all asterisks
    botReply = botReply.replace(/\*/g, "");

    // Animate instead of instantly showing
    animateBotReply(botReply);

  } catch (error) {
    console.error(error);
    setIsTyping(false);
  }
};


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);

  try {
    // Send file to backend
    const res = await fetch("http://127.0.0.1:5001/upload", {
      method: "POST",
      body: formData,
    });
    const data = await res.json();
    const fileContent = data.content || "";

    // Add extracted content as a user message
    const fileMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: fileContent,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, fileMessage]);

    // Optionally, send this content to LLaMA automatically
    setInputValue(fileContent);
    handleSendMessage();

  } catch (error) {
    console.error("File upload error:", error);
  }

  // Clear file input
  e.target.value = '';
};


  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const suggestedPrompts = [
    "Create a study schedule for my upcoming exams",
    "Generate a quiz from my uploaded PDF",
    "Help me understand machine learning concepts",
    "Set up reminders for my study sessions"
  ];

  return (
    <div className="min-h-screen">
      <Navigation />
      
      <main className="ml-64 flex flex-col h-screen">
        {/* Header */}
        <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-700/50 p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI Study Assistant</h1>
              <p className="text-slate-400">Your intelligent learning companion</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === 'user' ? 'bg-gradient-to-r from-blue-500 to-cyan-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}>
                {message.type === 'user' ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              
              <div className={`max-w-3xl ${message.type === 'user' ? 'text-right' : ''}`}>
                <div className={`inline-block p-4 rounded-2xl ${message.type === 'user' ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white' : 'bg-slate-800/50 border border-slate-700/50 text-white'}`}>
                  <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                </div>
                <p className="text-xs text-slate-500 mt-2">{formatTime(message.timestamp)}</p>
              </div>
            </div>
          ))}

          {/* Animated typing reply */}
          {typingContent && (
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 text-white">
                <p className="whitespace-pre-wrap">{typingContent}</p>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Prompts */}
        {messages.length === 1 && (
          <div className="px-6 pb-4">
            <p className="text-slate-400 text-sm mb-3">Try asking me about:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => setInputValue(prompt)}
                  className="text-left p-3 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 hover:border-purple-500/30 rounded-lg text-slate-300 hover:text-white transition-all duration-300 text-sm"
                >
                  <Sparkles className="w-4 h-4 inline mr-2 text-purple-400" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="bg-slate-900/50 backdrop-blur-sm border-t border-slate-700/50 p-6">
          <div className="flex items-center space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white rounded-lg transition-all duration-300"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            
            <div className="flex-1 relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about your studies..."
                className="w-full p-4 pr-12 bg-slate-800/50 border border-slate-700 hover:border-purple-500 focus:border-purple-500 focus:outline-none text-white placeholder-slate-400 rounded-xl resize-none min-h-[56px] max-h-32 transition-all duration-300"
                rows={1}
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                className="absolute right-3 bottom-3 p-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:hover:from-purple-600 disabled:hover:to-pink-600 text-white rounded-lg transition-all duration-300"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            <button className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white rounded-lg transition-all duration-300">
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
