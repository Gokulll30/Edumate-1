import React, { useRef, useEffect, useState } from "react";
import Navigation from "./Navigation";
import { Send, Paperclip, Mic, Bot, User, Trash2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useChatContext } from "../context/ChatContext";
import {
  sendChatMessage,
  getChatHistory as apiGetChatHistory,
  uploadChatFile,
  getChatSessions as apiGetChatSessions,
  createChatSession as apiCreateChatSession,
  deleteChatSession as apiDeleteChatSession,
  youtubeSearch,
} from "../services/api";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  attachments?: string[];
}

interface LocalSession {
  id: number | string;
  title: string;
  message_count: number;
  created_at: string;
  saved?: boolean;
}

export default function ChatInterface() {
  const { user } = useAuth();
  const chatContext = useChatContext();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatContext.messages, chatContext.typingContent]);

  // Load chat sessions for the authenticated user (or anonymous fallback)
  useEffect(() => {
    const loadSessions = async () => {
      // Only load if we haven't loaded yet
      if (chatContext.chatLoaded) return;

      try {
        const res = await apiGetChatSessions();
        if (res && res.success) {
          const list = (res.sessions || []).map((s: any) => ({ ...s, id: Number(s.id), saved: true }));
          chatContext.setSessions(list);
          if (list.length > 0) {
            chatContext.setCurrentSessionId(Number(list[0].id));
            chatContext.setChatLoaded(true);
            return;
          }
        }

        // If no sessions, create an *unsaved* local session (don't persist to DB yet).
        const temp = {
          id: `temp-${Date.now()}`,
          title: 'New Chat',
          message_count: 0,
          created_at: new Date().toISOString(),
          saved: false,
        } as LocalSession;
        chatContext.setSessions([temp]);
        chatContext.setCurrentSessionId(temp.id);
        chatContext.setChatLoaded(true);
      } catch (err) {
        console.error("Error loading sessions:", err);
        chatContext.setChatLoaded(true);
      }
    };

    loadSessions();
  }, [user, chatContext]);

  // Load history whenever the current session changes using the centralized helper
  useEffect(() => {
    if (!chatContext.currentSessionId) return;
    loadHistoryForId(chatContext.currentSessionId);
  }, [chatContext.currentSessionId]);

  // Helper to load history for a session id (number or temp string)
  const loadHistoryForId = async (id: number | string | null) => {
    if (!id) return;
    try {
      if (typeof id === 'string' && id.startsWith('temp-')) {
        chatContext.setMessages([
          {
            id: Date.now().toString(),
            type: "bot",
            content:
              "Hello! I'm your AI study assistant. I can help you create study plans, generate quizzes from your materials, set reminders, and answer questions about your subjects. What would you like to work on today?",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const data = await apiGetChatHistory(Number(id));
      if (!data || !data.success) {
        return;
      }

      const history: Message[] = (data.history || []).map((msg: any) => ({
        id: String(msg.id),
        type: msg.role === "user" ? "user" : "bot",
        content: msg.message || msg.content || "",
        timestamp: new Date(msg.created_at || msg.timestamp),
      }));

      chatContext.setMessages(history.length ? history : [
        {
          id: Date.now().toString(),
          type: "bot",
          content:
            "Hello! I'm your AI study assistant. I can help you create study plans, generate quizzes from your materials, set reminders, and answer questions about your subjects. What would you like to work on today?",
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      console.error('Error loading history for id', id, err);
    }
  };

  // Load persisted session id for anonymous users
  useEffect(() => {
    try {
      // prefer stored array of ids (most recent first)
      const storedList = localStorage.getItem('chatSessionIds');
      if (storedList) {
        const ids: number[] = JSON.parse(storedList) || [];
        if (ids.length > 0 && !chatContext.currentSessionId) {
          chatContext.setCurrentSessionId(Number(ids[0]));
        }
      } else {
        const sid = localStorage.getItem('chatSessionId');
        if (sid && !chatContext.currentSessionId) chatContext.setCurrentSessionId(Number(sid));
      }
    } catch (_) { }
  }, []);

  const animateBotReply = (fullText: string) => {
    // fallback: append final bot message after streaming
    chatContext.setTypingContent("");
    chatContext.setIsTyping(false);
    const botMessage: Message = {
      id: (Date.now() + 1).toString(),
      type: "bot",
      content: fullText,
      timestamp: new Date(),
    };
    chatContext.setMessages((prev) => [...prev, botMessage]);
  };
  const [playing, setPlaying] = useState<Record<string, string>>({});

  const handleSendMessage = async () => {
    if (!chatContext.inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: "user",
      content: chatContext.inputValue.trim(),
      timestamp: new Date(),
    };

    chatContext.setMessages((prev) => [...prev, userMessage]);
    chatContext.setInputValue("");
    chatContext.setIsTyping(true);

    try {
      let sessionIdToUse: number | undefined = undefined;

      // If current session is a temp local session, create it in DB now
      if (typeof chatContext.currentSessionId === 'string' && chatContext.currentSessionId.startsWith('temp-')) {
        const created = await apiCreateChatSession();
        if (!created || !created.success || !created.session_id) {
          throw new Error('Failed to create session');
        }
        const sid = created.session_id as number;
        sessionIdToUse = sid;

        // Replace the temp session in our local list with the persisted one
        chatContext.setSessions((prev) => {
          const rest = prev.filter((p) => p.id !== chatContext.currentSessionId);
          const newSession: LocalSession = {
            id: sid,
            title: 'New Chat',
            message_count: 0,
            created_at: new Date().toISOString(),
            saved: true,
          };
          return [newSession, ...rest];
        });

        // Persist id list for anonymous sessions
        try {
          const stored = localStorage.getItem('chatSessionIds');
          let ids: number[] = stored ? JSON.parse(stored) || [] : [];
          if (!ids.includes(sessionIdToUse)) {
            ids.unshift(sessionIdToUse);
            ids = ids.slice(0, 50);
            localStorage.setItem('chatSessionIds', JSON.stringify(ids));
          }
        } catch (_) { }

        chatContext.setCurrentSessionId(sessionIdToUse);
      } else if (typeof chatContext.currentSessionId === 'number') {
        sessionIdToUse = chatContext.currentSessionId;
      } else if (typeof chatContext.currentSessionId === 'string') {
        // maybe a numeric string; try to coerce
        const n = Number(chatContext.currentSessionId);
        if (!isNaN(n)) sessionIdToUse = n;
      }

      // Stream the bot reply using the new streaming endpoint
      try {
        chatContext.setTypingContent("");
        chatContext.setIsTyping(true);

        const headers: any = { 'Content-Type': 'application/json' };
        const token = localStorage.getItem('authToken');
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const resp = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ message: userMessage.content, session_id: sessionIdToUse }),
        });

        if (!resp.ok || !resp.body) {
          throw new Error('Failed to stream reply');
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let done = false;
        let accumulated = '';

        while (!done) {
          const { value, done: d } = await reader.read();
          done = !!d;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            // The backend sends SSE-style `data: <text>\n\n`, so strip `data: ` framing
            const parts = chunk.split('\n\n').filter(Boolean);
            for (const p of parts) {
              const text = p.replace(/^data:\s?/, '');
              accumulated += text;
              // Update typing content so the UI shows streaming text
              chatContext.setTypingContent(accumulated);
            }
          }
        }

        // streaming finished: accumulated contains full reply
        const botReply = accumulated.replace(/\*/g, '');

        // After stream completes, refresh sessions to pick up any server-side title updates
        try {
          const list = await apiGetChatSessions();
          if (list && list.success) chatContext.setSessions((prev) => {
            const server = (list.sessions || []).map((s: any) => ({ ...s, id: Number(s.id), saved: true }));
            const temps = prev.filter((p) => typeof p.id === 'string' && String(p.id).startsWith('temp-'));
            return [...server, ...temps];
          });
        } catch (err) {
          console.error('Failed to refresh sessions after send:', err);
        }

        animateBotReply(botReply);

        // Fetch related YouTube videos for the user's prompt and attach to the bot message
        try {
          const vids = await youtubeSearch(userMessage.content, 2);
          if (vids && vids.success && vids.videos && vids.videos.length) {
            chatContext.setMessages((prev) => {
              const updated = [...prev];
              const lastIdx = updated.length - 1;
              if (lastIdx >= 0) {
                const last = updated[lastIdx];
                updated[lastIdx] = {
                  ...last,
                  attachments: vids.videos.slice(0,2).map((v: any) => ({ ...v, type: 'youtube' })),
                } as any;
              }
              return updated;
            });
          }
        } catch (err) {
          console.error('YouTube attach error:', err);
        }
      } catch (errStream) {
        console.error('Streaming error:', errStream);
        chatContext.setIsTyping(false);
        chatContext.setTypingContent('');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      chatContext.setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
      const data = await uploadChatFile(file);
      if (!data || !data.success) throw new Error(data.error || "File upload failed");
      const fileContent: string = data.fileText || "";

      const fileMessage: Message = {
        id: Date.now().toString(),
        type: "user",
        content: fileContent,
        timestamp: new Date(),
      };
      chatContext.setMessages((prev) => [...prev, fileMessage]);

      chatContext.setInputValue(fileContent);
      await handleSendMessage();
    } catch (error) {
      console.error("Error uploading file:", error);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });



  return (
    <div className="min-h-screen bg-gray-900">
      <Navigation />
      <main className="ml-64 flex flex-col h-screen bg-gray-900">
        {/* Header */}
        <div className="bg-slate-900 border-b border-slate-700 p-6">
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
        <div className="flex flex-1">
          {/* Left: Chat sessions sidebar */}
          <aside className="w-56 min-w-[14rem] border-r border-slate-800 bg-slate-900 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Chats</h2>
              <button
                onClick={() => {
                  // Create a local unsaved session. It will only be persisted when the user sends
                  // the first message in that session.
                  try {
                    const temp = {
                      id: `temp-${Date.now()}`,
                      title: 'New Chat',
                      message_count: 0,
                      created_at: new Date().toISOString(),
                      saved: false,
                    } as LocalSession;
                    chatContext.setSessions((prev) => [temp, ...(prev || [])]);
                    chatContext.setCurrentSessionId(temp.id);
                    chatContext.setMessages([
                      {
                        id: Date.now().toString(),
                        type: "bot",
                        content:
                          "Hello! I'm your AI study assistant. I can help you create study plans, generate quizzes from your materials, set reminders, and answer questions about your subjects. What would you like to work on today?",
                        timestamp: new Date(),
                      },
                    ]);
                  } catch (err) {
                    console.error("Create temp session error:", err);
                  }
                }}
                className="text-sm text-slate-200 bg-slate-800 px-2 py-1 rounded hover:bg-slate-700"
              >
                New
              </button>
            </div>
            <div className="space-y-2 overflow-y-auto">
              {chatContext.sessions.map((s) => (
                <div
                  key={String(s.id)}
                  onClick={async () => {
                    // normalize numeric-like ids
                    let selected: number | string = s.id;
                    if (typeof s.id === 'string' && !s.id.startsWith('temp-')) {
                      const n = Number(s.id);
                      selected = isNaN(n) ? s.id : n;
                    }
                    chatContext.setCurrentSessionId(selected);
                    // load history immediately for better UX
                    await loadHistoryForId(selected);
                  }}
                  className={`p-2 rounded cursor-pointer hover:bg-slate-800 flex items-center justify-between ${String(s.id) === String(chatContext.currentSessionId) ? "bg-slate-800" : ""
                    }`}
                >
                  <div>
                    <div className="text-sm text-slate-200">{s.title || "New Chat"}</div>
                    <div className="text-xs text-slate-500">{s.message_count || 0} messages</div>
                  </div>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      try {
                        // If this is an unsaved local session, just remove locally
                        if (typeof s.id === 'string' && String(s.id).startsWith('temp-')) {
                          chatContext.setSessions((prev) => prev.filter((p) => String(p.id) !== String(s.id)));
                          if (String(s.id) === String(chatContext.currentSessionId)) {
                            // open a fresh new temp session
                            const temp = {
                              id: `temp-${Date.now()}`,
                              title: 'New Chat',
                              message_count: 0,
                              created_at: new Date().toISOString(),
                              saved: false,
                            } as LocalSession;
                            chatContext.setSessions((prev) => [temp, ...(prev || [])]);
                            chatContext.setCurrentSessionId(temp.id);
                            chatContext.setMessages([
                              {
                                id: Date.now().toString(),
                                type: "bot",
                                content:
                                  "Hello! I'm your AI study assistant. I can help you create study plans, generate quizzes from your materials, set reminders, and answer questions about your subjects. What would you like to work on today?",
                                timestamp: new Date(),
                              },
                            ]);
                          }
                        } else {
                          const numericId = Number(s.id);
                          const res = await apiDeleteChatSession(numericId);
                          if (res && res.success) {
                            // Remove the session id locally if present
                            try {
                              const stored = localStorage.getItem('chatSessionIds');
                              if (stored) {
                                let ids: number[] = JSON.parse(stored) || [];
                                ids = ids.filter((x) => x !== numericId);
                                localStorage.setItem('chatSessionIds', JSON.stringify(ids));
                              }
                            } catch (_) { }

                            // Remove from local sessions state (handle mixed id types)
                            chatContext.setSessions((prev) => prev.filter((p) => Number(p.id) !== numericId));

                            if (String(s.id) === String(chatContext.currentSessionId)) {
                              // pick the next available session (if any) after deletion
                              const remaining = (chatContext.sessions || []).filter((p) => String(p.id) !== String(s.id));
                              if (remaining.length > 0) {
                                const next = remaining[0];
                                chatContext.setCurrentSessionId(next.id);
                                await loadHistoryForId(next.id);
                              } else {
                                const temp = {
                                  id: `temp-${Date.now()}`,
                                  title: 'New Chat',
                                  message_count: 0,
                                  created_at: new Date().toISOString(),
                                  saved: false,
                                } as LocalSession;
                                chatContext.setSessions([temp]);
                                chatContext.setCurrentSessionId(temp.id);
                                chatContext.setMessages([
                                  {
                                    id: Date.now().toString(),
                                    type: "bot",
                                    content:
                                      "Hello! I'm your AI study assistant. I can help you create study plans, generate quizzes from your materials, set reminders, and answer questions about your subjects. What would you like to work on today?",
                                    timestamp: new Date(),
                                  },
                                ]);
                              }
                            }
                          }
                        }
                      } catch (err) {
                        console.error("Delete session error:", err);
                      }
                    }}
                    className="text-xs text-rose-400 ml-2 p-1 rounded hover:bg-slate-800"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </aside>

          {/* Right: Chat area */}
          <section className="flex-1 flex flex-col bg-gray-900">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-gray-900 pb-32">
              <div className="w-full">
                {chatContext.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex items-start space-x-4 ${message.type === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                      }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${message.type === "user"
                        ? "bg-gradient-to-r from-blue-500 to-cyan-500"
                        : "bg-gradient-to-r from-purple-500 to-pink-500"
                        }`}
                    >
                      {message.type === "user" ? (
                        <User className="w-5 h-5 text-white" />
                      ) : (
                        <Bot className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <div
                      className={`max-w-xl ${message.type === "user" ? "text-right" : ""
                        }`}
                    >
                      <div
                        className={`inline-block p-4 rounded-2xl shadow-md ${message.type === "user"
                          ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white"
                          : "bg-slate-800 border border-slate-700 text-white"
                          }`}
                      >
                        <p className="whitespace-pre-wrap leading-relaxed">
                          {message.content}
                        </p>
                        {/* Attachments (e.g., YouTube results) */}
                        {message.attachments && message.attachments.length > 0 && (
                          <div className="mt-3 space-y-3">
                            {message.attachments.map((att: any, idx: number) => (
                              <div key={idx} className="flex flex-col">
                                <div
                                  className="flex items-center space-x-3 cursor-pointer hover:bg-slate-800 p-2 rounded"
                                  onClick={() => setPlaying((prev) => ({ ...prev, [message.id]: att.videoId }))}
                                >
                                  {att.thumbnail && (
                                    <img src={att.thumbnail} alt={att.title} className="w-28 h-16 object-cover rounded" />
                                  )}
                                  <div className="flex-1">
                                    <div className="text-sm text-slate-100 font-medium">{att.title}</div>
                                    <div className="text-xs text-slate-400">{att.channelTitle}</div>
                                  </div>
                                </div>
                                {playing[message.id] === att.videoId && (
                                  <div className="mt-3">
                                    <iframe
                                      className="w-full h-64 rounded-lg"
                                      src={`https://www.youtube.com/embed/${att.videoId}?autoplay=1`}
                                      title={att.title}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                    />
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-2">
                        {formatTime(message.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Animated typing reply */}
                {chatContext.typingContent && (
                  <div className="flex items-start space-x-4">
                    <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-white shadow-md">
                      <p className="whitespace-pre-wrap">{chatContext.typingContent}</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>
          </section>
        </div>
        
        {/* Input Area: fixed to bottom to avoid being pushed down by long responses */}
        <div className="fixed left-64 right-0 bottom-0 z-40 bg-slate-900 border-t border-slate-700 p-6">
          <div className="flex items-center space-x-3">
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              multiple={false}
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white rounded-lg shadow-md transition-all duration-300"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <textarea
                value={chatContext.inputValue}
                onChange={(e) => chatContext.setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask me anything about your studies..."
                className="w-full p-4 pr-12 bg-slate-800 border border-slate-700 hover:border-purple-500 focus:border-purple-500 focus:outline-none text-white placeholder-slate-400 rounded-xl resize-none min-h-[56px] max-h-32 transition-all duration-300 text-base"
                rows={1}
                disabled={chatContext.isTyping}
              />
              <button
                onClick={handleSendMessage}
                disabled={!chatContext.inputValue.trim() || chatContext.isTyping}
                className="absolute right-3 bottom-3 p-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:hover:from-purple-600 disabled:hover:to-pink-600 text-white rounded-lg transition-all duration-300 shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <button className="p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-purple-500 text-slate-300 hover:text-white rounded-lg shadow-md transition-all duration-300">
              <Mic className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}