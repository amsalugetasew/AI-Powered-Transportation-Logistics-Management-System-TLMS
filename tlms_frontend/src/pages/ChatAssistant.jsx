import { useState, useEffect, useRef } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import api from '../api/api';

export default function ChatAssistant() {
  const { theme, isDarkMode } = useTheme();
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingTitle, setEditingTitle] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editingMessage, setEditingMessage] = useState(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [conversationContext, setConversationContext] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    loadConversations();
  }, []);

  const loadConversations = async () => {
    try {
      const response = await api.get('ai/history/');
      setConversations(response.data);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadConversation = async (convId) => {
    try {
      const response = await api.get(`ai/conversation/${convId}/`);
      setCurrentConversation(response.data);
      
      const parsedMessages = response.data.messages.map(msg => {
        let content = msg.content;
        if (typeof content === 'string' && content.startsWith('{')) {
          try {
            content = JSON.parse(content.replace(/'/g, '"'));
          } catch (e) {}
        }
        return {
          ...msg,
          content: content,
          timestamp: msg.timestamp
        };
      });
      
      setMessages(parsedMessages);
      buildConversationContext(parsedMessages);
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const buildConversationContext = (msgs) => {
    const context = msgs.filter(m => m.role === 'user').map((m, idx) => ({
      turn: idx + 1,
      query: typeof m.content === 'string' ? m.content : m.content.content || '',
      response_type: msgs[idx * 2 + 1]?.metadata?.format || 'text'
    }));
    setConversationContext(context);
  };

  const startNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
    setConversationContext([]);
  };

  const deleteConversation = async (convId) => {
    if (!confirm('Are you sure you want to delete this conversation?')) return;
    
    try {
      await api.delete(`ai/conversation/${convId}/`);
      setConversations(conversations.filter(c => c.id !== convId));
      if (currentConversation?.id === convId) {
        startNewConversation();
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      alert('Failed to delete conversation');
    }
  };

  const updateConversationTitle = async (convId, newTitle) => {
    try {
      await api.patch(`ai/conversation/${convId}/`, { title: newTitle });
      setConversations(conversations.map(c => 
        c.id === convId ? { ...c, title: newTitle } : c
      ));
      if (currentConversation?.id === convId) {
        setCurrentConversation({ ...currentConversation, title: newTitle });
      }
      setEditingTitle(null);
    } catch (error) {
      console.error('Error updating title:', error);
      alert('Failed to update title');
    }
  };

  const deleteMessage = async (msgId) => {
    if (!confirm('Delete this message and all following messages?')) return;
    
    try {
      await api.delete(`ai/message/${msgId}/`);
      await loadConversation(currentConversation.id);
      loadConversations();
    } catch (error) {
      console.error('Error deleting message:', error);
      alert('Failed to delete message');
    }
  };

  const editMessage = async (msgId, newContent) => {
    try {
      await api.patch(`ai/message/${msgId}/`, { content: newContent });
      setEditingMessage(null);
      await sendMessage(newContent, true);
      await loadConversation(currentConversation.id);
    } catch (error) {
      console.error('Error editing message:', error);
      alert('Failed to edit message');
    }
  };

  const exampleQueries = [
    "Show me all active vehicles",
    "Generate a report of drivers in a table",
    "Create a bar chart of vehicle status",
    "Export all vehicles to Excel",
    "Which vehicles need maintenance?"
  ];

  const sendMessage = async (messageText = null, isRegenerate = false) => {
    const textToSend = messageText || input;
    if (!textToSend.trim()) return;

    const userMessage = {
      role: 'user',
      content: textToSend,
      timestamp: new Date()
    };

    if (!isRegenerate) {
      setMessages([...messages, userMessage]);
      setInput('');
    }
    setLoading(true);

    try {
      let contextHint = '';
      if (conversationContext.length > 0) {
        const lastContext = conversationContext[conversationContext.length - 1];
        contextHint = `\n\n[Context: Previous request was about ${lastContext.query} with ${lastContext.response_type} format]`;
      }

      const response = await api.post('ai/chat/', {
        message: textToSend + contextHint,
        conversation_id: currentConversation?.id
      });

      if (!currentConversation) {
        setCurrentConversation({ id: response.data.conversation_id });
        loadConversations();
      }

      const aiMessage = {
        role: 'assistant',
        content: response.data.result,
        analysis: response.data.analysis,
        messageId: response.data.message_id,
        metadata: response.data.analysis,
        timestamp: new Date()
      };

      if (!isRegenerate) {
        setMessages(prev => [...prev, aiMessage]);
        setConversationContext(prev => [...prev, {
          turn: prev.length + 1,
          query: textToSend,
          response_type: response.data.analysis?.format || 'text'
        }]);
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = error.response?.data?.details || error.response?.data?.error || 'Sorry, I encountered an error.';
      if (!isRegenerate) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: { type: 'text', content: errorMessage },
          timestamp: new Date()
        }]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex h-full gap-0">
      {/* Sidebar - Fixed, Not Scrollable */}
      <div className={`w-80 ${theme.sidebar} border-r ${theme.border} flex flex-col h-full`}>
        <div className="p-4 border-b ${theme.border} flex-shrink-0">
          <button
            onClick={startNewConversation}
            className={`w-full px-4 py-3 ${
              isDarkMode ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#8E288D] hover:bg-[#7a1f7a]'
            } text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Chat
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
          <h3 className={`text-xs font-semibold ${theme.textSecondary} uppercase px-3 py-2`}>
            Chat History
          </h3>
          <div className="space-y-1">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`group relative rounded-lg transition-colors ${
                  currentConversation?.id === conv.id 
                    ? isDarkMode ? 'bg-violet-600' : 'bg-[#8E288D] text-white'
                    : `${theme.hover} ${theme.textPrimary}`
                }`}
              >
                {editingTitle === conv.id ? (
                  <div className="p-2">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          updateConversationTitle(conv.id, editTitle);
                        }
                      }}
                      onBlur={() => {
                        if (editTitle.trim()) {
                          updateConversationTitle(conv.id, editTitle);
                        } else {
                          setEditingTitle(null);
                        }
                      }}
                      className={`w-full px-2 py-1 text-sm ${theme.cardBg} border ${theme.border} ${theme.textPrimary} rounded`}
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center">
                    <button
                      onClick={() => loadConversation(conv.id)}
                      className="flex-1 text-left p-3"
                    >
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        <span className="text-sm truncate">{conv.title}</span>
                      </div>
                      <div className="text-xs opacity-70 mt-1">
                        {conv.message_count} messages
                      </div>
                    </button>
                    
                    <div className="flex items-center gap-1 pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingTitle(conv.id);
                          setEditTitle(conv.title);
                        }}
                        className="p-1 hover:bg-white/20 rounded"
                        title="Edit title"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="p-1 hover:bg-red-500 rounded"
                        title="Delete conversation"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className={`${theme.cardBg} border-b ${theme.border} p-4`}>
          <div className="flex items-center gap-3">
            <div className="text-3xl">🤖</div>
            <div>
              <h1 className={`text-2xl font-bold ${theme.textPrimary}`}>
                AI Fleet Assistant
              </h1>
              <p className={`text-sm ${theme.textSecondary}`}>
                Ask me anything - I remember our conversation context!
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-0">
          <div className="w-full space-y-0">
            {messages.length === 0 && (
              <div className="text-center py-2">
                {/* <div className="text-8xl mb-6">🤖</div>
                <h3 className={`text-2xl font-semibold ${theme.textPrimary} mb-3`}>
                  Hi! I'm your AI Fleet Assistant
                </h3>
                <p className={`${theme.textSecondary} mb-6 text-lg`}>
                  Try asking me:
                </p> */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-6xl mx-auto">
                  {exampleQueries.map((example, idx) => (
                    <button
                      key={idx}
                      onClick={() => setInput(example)}
                      className={`text-left px-6 py-4 ${theme.cardBg} border ${theme.border} rounded-xl ${theme.hover} transition-all text-base ${theme.textPrimary} shadow-sm hover:shadow-md`}
                    >
                      <span className="mr-3">💬</span>
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <MessageBubble 
                key={`${msg.id}-${idx}`}
                message={msg} 
                theme={theme} 
                isDarkMode={isDarkMode}
                onEdit={(msgId) => {
                  setEditingMessage(msgId);
                  setEditMessageContent(typeof msg.content === 'string' ? msg.content : msg.content.content || '');
                }}
                onDelete={(msgId) => deleteMessage(msgId)}
                isEditing={editingMessage === msg.id}
                editContent={editMessageContent}
                setEditContent={setEditMessageContent}
                onSaveEdit={(msgId) => editMessage(msgId, editMessageContent)}
                onCancelEdit={() => setEditingMessage(null)}
              />
            ))}

            {loading && (
              <div className="flex items-center gap-3">
                <div className={`animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 ${
                  isDarkMode ? 'border-violet-500' : 'border-[#8E288D]'
                }`}></div>
                <span className={theme.textSecondary}>AI is thinking...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className={`${theme.cardBg} border-t ${theme.border} p-6`}>
          <div className="w-full flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your fleet..."
              className={`flex-1 px-4 py-3 ${theme.cardBg} border ${theme.border} ${theme.textPrimary} rounded-xl focus:ring-2 ${
                isDarkMode ? 'focus:ring-violet-500' : 'focus:ring-[#8E288D]'
              } focus:border-transparent resize-none`}
              rows="3"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || loading}
              className={`px-8 py-3 ${
                isDarkMode ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#8E288D] hover:bg-[#7a1f7a]'
              } text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium shadow-lg hover:shadow-xl`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, theme, isDarkMode, onEdit, onDelete, isEditing, editContent, setEditContent, onSaveEdit, onCancelEdit }) {
  const isUser = message.role === 'user';
  const content = message.content;

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}>
      <div className={`w-full ${isUser ? 'max-w-2xl ml-auto' : 'max-w-full'}`}>
        {!isUser && (
          <div className="flex items-center gap-2 mb-2">
            <span className="text-2xl">🤖</span>
            <span className={`font-semibold ${theme.textPrimary}`}>AI Assistant</span>
          </div>
        )}
        
        <div className="relative">
          {isEditing ? (
            <div className={`px-6 py-4 rounded-2xl ${theme.cardBg} border ${theme.border}`}>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className={`w-full px-3 py-2 ${theme.cardBg} border ${theme.border} ${theme.textPrimary} rounded-lg`}
                rows="3"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => onSaveEdit(message.id)}
                  className={`px-4 py-2 ${isDarkMode ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#8E288D] hover:bg-[#7a1f7a]'} text-white rounded-lg text-sm`}
                >
                  Save & Regenerate
                </button>
                <button
                  onClick={onCancelEdit}
                  className={`px-4 py-2 ${theme.hover} border ${theme.border} rounded-lg text-sm`}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className={`px-6 py-4 rounded-2xl shadow-md ${
                isUser 
                  ? isDarkMode ? 'bg-violet-600 text-white' : 'bg-[#8E288D] text-white'
                  : `${theme.cardBg} border ${theme.border}`
              }`}>
                {typeof content === 'string' ? (
                  <p className={isUser ? 'text-white' : theme.textPrimary}>{content}</p>
                ) : content.type === 'text' ? (
                  <div className={`prose ${isDarkMode ? 'prose-invert' : ''} max-w-none`}>
                    <p className={isUser ? 'text-white whitespace-pre-line' : `${theme.textPrimary} whitespace-pre-line`}>
                      {content.content}
                    </p>
                  </div>
                ) : content.type === 'table' ? (
                  <TableRenderer data={content} theme={theme} />
                ) : content.type === 'chart' ? (
                  <ChartRenderer data={content} />
                ) : content.type === 'file' ? (
                  <FileDownload data={content} messageId={message.messageId} theme={theme} isDarkMode={isDarkMode} />
                ) : null}
              </div>
              
              {/* Edit/Delete buttons - only for user messages */}
              {isUser && message.id && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={() => onEdit(message.id)}
                    className="p-1.5 bg-white/90 hover:bg-white rounded shadow-lg"
                    title="Edit message"
                  >
                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => onDelete(message.id)}
                    className="p-1.5 bg-white/90 hover:bg-red-500 hover:text-white rounded shadow-lg"
                    title="Delete message"
                  >
                    <svg className="w-4 h-4 text-gray-700 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        
        <div className={`text-xs ${theme.textSecondary} mt-2 ${isUser ? 'text-right' : 'text-left'}`}>
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

function TableRenderer({ data, theme }) {
  if (!data.rows || data.rows.length === 0) {
    return (
      <div className={`text-center py-8 ${theme.textSecondary}`}>
        <p>No data available</p>
      </div>
    );
  }

  return (
    <div className="mt-4 w-full">
      <p className={`${theme.textSecondary} mb-3 text-sm`}>
        Found {data.count} result{data.count !== 1 ? 's' : ''}
      </p>
      <div className="overflow-x-auto rounded-lg border ${theme.border} w-full">
        <table className="min-w-full w-full">
          <thead className={theme.cardBg === 'bg-white' ? 'bg-gray-100' : 'bg-slate-900'}>
            <tr>
              {data.columns.map((col, idx) => (
                <th key={idx} className={`px-4 py-3 border-b ${theme.border} ${theme.textPrimary} text-left text-sm font-semibold whitespace-nowrap`}>
                  {col.replace(/_/g, ' ').toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, idx) => (
              <tr key={idx} className={theme.hover}>
                {data.columns.map((col, colIdx) => (
                  <td key={colIdx} className={`px-4 py-3 border-b ${theme.border} ${theme.textPrimary} text-sm`}>
                    {row[col]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ChartRenderer({ data }) {
  return (
    <div className="mt-4 w-full">
      <img src={data.image} alt="Chart" className="w-full rounded-lg shadow-lg" />
    </div>
  );
}

function FileDownload({ data, messageId, theme, isDarkMode }) {
  const downloadFile = async () => {
    try {
      const response = await api.get(`ai/download/${messageId}/`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', data.filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file. Please try again.');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="mt-4 p-4 border ${theme.border} rounded-lg w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${isDarkMode ? 'bg-violet-500/20' : 'bg-purple-100'}`}>
            <svg className={`w-8 h-8 ${isDarkMode ? 'text-violet-400' : 'text-[#8E288D]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <p className={`font-semibold ${theme.textPrimary}`}>{data.filename}</p>
            <p className={`text-sm ${theme.textSecondary}`}>
              {data.format.toUpperCase()} • {formatFileSize(data.size)}
            </p>
          </div>
        </div>
        <button
          onClick={downloadFile}
          className={`flex items-center gap-2 px-6 py-3 ${
            isDarkMode ? 'bg-violet-600 hover:bg-violet-700' : 'bg-[#8E288D] hover:bg-[#7a1f7a]'
          } text-white rounded-lg transition-colors font-medium shadow-md hover:shadow-lg`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download
        </button>
      </div>
    </div>
  );
}
