
import React, { useState, useRef, useEffect } from 'react';
import { Send, MoreVertical, Phone, Video, ArrowLeft, Paperclip, Smile, Check, CheckCheck, SmilePlus, X, FileText, Camera, Trash2, Pencil, Zap, Ban, Unlock } from 'lucide-react';
import { ChatMessage, Contact, Attachment, CallMode } from '../types';
import CallInterface from './CallInterface';
import CameraCapture from './CameraCapture';
import { STORAGE_KEY_CONTACTS } from '../constants';
import { getConversation, sendMessage, editMessage, updateMessageReaction, clearHistory, subscribeToMessages, getLatestContactInfo, markMessagesAsRead, blockUser, unblockUser, isUserBlocked } from '../services/chatService';

interface SecureChatProps {
    contact: Contact;
    onBack: () => void;
}

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥'];

const SecureChat: React.FC<SecureChatProps> = ({ contact: initialContact, onBack }) => {
  const [contact, setContact] = useState(initialContact);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeCallMode, setActiveCallMode] = useState<CallMode | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [inputText, setInputText] = useState('');
  const [isBlocked, setIsBlocked] = useState(false);
  
  // Confirmation Modal State
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  // Edit State
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  // Real-time Socket Subscription (Messages & Presence)
  useEffect(() => {
    const syncData = () => {
        // 1. Fetch Messages
        const conversation = getConversation(initialContact.name);
        setMessages(conversation);

        // 2. Fetch Live Status
        const latestInfo = getLatestContactInfo(initialContact);
        setContact(prev => ({ ...prev, status: latestInfo.status }));
        
        // 3. Check Block Status
        setIsBlocked(isUserBlocked(initialContact.name));
    };

    syncData();
    // Mark as read initially when opening
    markMessagesAsRead(initialContact.name);
    
    const unsubscribe = subscribeToMessages(() => {
        syncData();
        // Mark as read whenever new updates come in and I'm looking at this chat
        markMessagesAsRead(initialContact.name);
    });

    return () => { unsubscribe(); };
  }, [initialContact]);

  // Auto scroll on new messages
  useEffect(() => { 
      if (!editingMsgId) scrollToBottom(); 
  }, [messages.length, editingMsgId]);

  const saveContactInteraction = (lastText: string) => {
      const stored = localStorage.getItem(STORAGE_KEY_CONTACTS);
      const contacts: Contact[] = stored ? JSON.parse(stored) : [];
      const idx = contacts.findIndex(c => c.name === contact.name); 
      
      const updated = { 
          ...contact, 
          lastMessage: lastText, 
          lastTimestamp: Date.now() 
      };
      
      if (idx >= 0) {
          contacts[idx] = updated;
      } else {
          contacts.push(updated);
      }
      localStorage.setItem(STORAGE_KEY_CONTACTS, JSON.stringify(contacts));
  };

  const handleClearChat = () => {
      setIsMenuOpen(false);
      setShowClearConfirm(true);
  };

  const confirmClear = () => {
      clearHistory(contact.name);
      setMessages([]);
      saveContactInteraction('History cleared');
      setShowClearConfirm(false);
  };
  
  const handleBlockToggle = () => {
      if (isBlocked) {
          unblockUser(contact.name);
      } else {
          blockUser(contact.name);
      }
      setIsBlocked(!isBlocked);
      setIsMenuOpen(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) return alert("File max 5MB");
      const reader = new FileReader();
      reader.onload = (ev) => {
          setAttachment({
              type: file.type.startsWith('image/') ? 'image' : 'file',
              url: ev.target?.result as string,
              name: file.name,
              size: (file.size / 1024).toFixed(0) + ' KB'
          });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !attachment) || isBlocked) return;
    
    // 1. Send Message (Stored locally & broadcasted via Socket)
    sendMessage(inputText, contact.name, attachment);
    saveContactInteraction(inputText || "[Attachment]");
    
    setInputText('');
    setAttachment(null);
    scrollToBottom();
  };

  const toggleReaction = (id: string, emoji: string) => {
      const msg = messages.find(m => m.id === id);
      const newReaction = msg?.reaction === emoji ? undefined : emoji;
      updateMessageReaction(id, newReaction);
      setActiveReactionMsgId(null);
  };

  const startEditing = (msg: ChatMessage) => {
      setEditingMsgId(msg.id);
      setEditText(msg.text);
      setActiveReactionMsgId(null);
  };

  const saveEdit = () => {
      if (!editingMsgId || !editText.trim()) return;
      editMessage(editingMsgId, editText);
      
      // If we are editing the most recent message, update the contact preview in storage
      if (messages.length > 0 && messages[messages.length - 1].id === editingMsgId) {
          saveContactInteraction(editText);
      }

      setEditingMsgId(null);
      setEditText('');
  };

  const cancelEdit = () => {
      setEditingMsgId(null);
      setEditText('');
  };

  return (
    <div className="flex flex-col h-full bg-[#000000] relative">
      {activeCallMode && !isBlocked && <CallInterface contact={contact} mode={activeCallMode} onEndCall={() => setActiveCallMode(null)} />}
      {isCameraOpen && <CameraCapture onCapture={(img) => { setAttachment({ type:'image', url:img, name:`cam_${Date.now()}.jpg` }); setIsCameraOpen(false); }} onClose={() => setIsCameraOpen(false)} />}
      
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      {/* Header */}
      <header className="flex items-center justify-between px-4 pt-12 pb-3 bg-[#161618]/80 backdrop-blur-xl border-b border-white/5 z-20 sticky top-0">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="p-2 -ml-2 text-emerald-500 hover:bg-emerald-500/10 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div className="flex items-center gap-3">
             <div className="relative">
                <div className={`w-9 h-9 rounded-full overflow-hidden border ${isBlocked ? 'bg-red-900/20 border-red-500/50' : 'bg-slate-800 border-slate-700'}`}>
                    {contact.avatar ? <img src={contact.avatar} alt="c" className={`w-full h-full object-cover ${isBlocked ? 'grayscale opacity-50' : ''}`} /> : <div className="flex h-full items-center justify-center text-slate-400">{contact.name[0]}</div>}
                </div>
                {!isBlocked && contact.status === 'online' && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#161618] rounded-full animate-pulse"></div>}
                {!isBlocked && contact.status === 'busy' && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-red-500 border-2 border-[#161618] rounded-full"></div>}
             </div>
             <div>
                 <h1 className="text-white font-semibold text-sm leading-none flex items-center gap-1">
                    {contact.name}
                    {!contact.isAi && (
                        <span title="Live Socket Connection">
                            <Zap size={12} className="text-emerald-500 fill-current" />
                        </span>
                    )}
                 </h1>
                 <div className="flex items-center gap-2 mt-0.5 h-4">
                    {isBlocked ? (
                        <span className="text-[11px] font-medium text-red-500 flex items-center gap-1"><Ban size={10} /> BLOCKED</span>
                    ) : (
                        <span className={`text-[11px] font-medium transition-colors duration-500
                            ${contact.status === 'online' ? 'text-emerald-500' : contact.status === 'busy' ? 'text-red-400' : 'text-slate-500'}`}>
                            {contact.status === 'online' ? 'Online' : 
                             contact.status === 'busy' ? 'Do Not Disturb' : 'Offline'}
                        </span>
                    )}
                 </div>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-3 text-emerald-500">
             {!isBlocked && (
                 <>
                    <button title="Audio Call" onClick={() => setActiveCallMode('audio')}><Phone size={22} /></button>
                    <button title="Video Call" onClick={() => setActiveCallMode('video')}><Video size={24} /></button>
                 </>
             )}
             <div className="relative">
                 <button onClick={() => setIsMenuOpen(!isMenuOpen)}><MoreVertical size={22} /></button>
                 {isMenuOpen && (
                    <>
                        <div className="fixed inset-0" onClick={() => setIsMenuOpen(false)}></div>
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1c1c1e] rounded-xl border border-white/10 shadow-2xl z-50 overflow-hidden">
                            <button onClick={handleBlockToggle} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-white/5 flex gap-2 border-b border-white/5">
                                {isBlocked ? (
                                    <><Unlock size={16} className="text-emerald-500"/> Unblock User</>
                                ) : (
                                    <><Ban size={16} className="text-red-500"/> Block User</>
                                )}
                            </button>
                            <button onClick={handleClearChat} className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-white/5 flex gap-2"><Trash2 size={16}/> Clear Chat</button>
                        </div>
                    </>
                 )}
             </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
        {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isEditable = isUser && (Date.now() - msg.timestamp < 15 * 60 * 1000);
            
            return (
                <div key={msg.id} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} group animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`relative max-w-[80%] px-4 py-2.5 text-[15px] shadow-sm leading-snug break-words transition-all duration-300
                            ${isUser 
                                ? 'bg-emerald-600 text-white rounded-[20px] rounded-tr-[4px]' 
                                : 'bg-[#262626] text-slate-200 rounded-[20px] rounded-tl-[4px] border border-white/5'}`}>
                        
                        {!isBlocked && activeReactionMsgId === msg.id && (
                            <div className="absolute -top-10 bg-[#1c1c1e] border border-white/10 rounded-full p-1 flex gap-1 shadow-xl z-30 animate-in zoom-in duration-200">
                                {REACTIONS.map(r => <button key={r} onClick={() => toggleReaction(msg.id, r)} className="hover:scale-125 transition-transform p-1">{r}</button>)}
                            </div>
                        )}

                        {/* Content inside Bubble */}
                        <div>
                            {msg.attachment && (
                                <div className="mb-2 rounded-lg overflow-hidden border border-black/10">
                                    {msg.attachment.type === 'image' ? <img src={msg.attachment.url} alt="att" className="w-full" /> : <div className="p-3 bg-white/10 flex gap-2 items-center"><FileText size={20}/> <span className="text-xs truncate">{msg.attachment.name}</span></div>}
                                </div>
                            )}

                            {editingMsgId === msg.id ? (
                                <div className="min-w-[140px]">
                                    <input 
                                        value={editText} 
                                        onChange={e => setEditText(e.target.value)}
                                        className="w-full bg-black/20 text-white px-2 py-1 rounded outline-none border border-white/30 focus:border-white/50 text-sm"
                                        autoFocus
                                        onKeyDown={e => {
                                            if (e.key === 'Enter') saveEdit();
                                            if (e.key === 'Escape') cancelEdit();
                                        }}
                                    />
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={cancelEdit} className="p-1 hover:bg-black/10 rounded"><X size={14}/></button>
                                        <button onClick={saveEdit} className="p-1 hover:bg-black/10 rounded"><Check size={14}/></button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {msg.text}
                                    {msg.isEdited && <span className="text-[10px] opacity-60 ml-1 italic">(edited)</span>}
                                </>
                            )}
                            
                            <div className={`text-[10px] flex items-center justify-end gap-1 mt-1 opacity-70 ${isUser ? 'text-emerald-100' : 'text-slate-400'}`}>
                                {new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                                {isUser && (
                                    <span className="flex items-center animate-in zoom-in duration-300 ml-1">
                                        {msg.status === 'read' ? (
                                            <CheckCheck size={14} className="text-emerald-200" />
                                        ) : (
                                            <Check size={14} className="text-white/70" />
                                        )}
                                    </span>
                                )}
                            </div>
                            {msg.reaction && <div className="absolute -bottom-2 -right-1 bg-[#2c2c2e] border border-black text-xs rounded-full px-1 shadow-sm animate-in zoom-in duration-300">{msg.reaction}</div>}
                        </div>
                        
                        {/* Hover Actions */}
                        {!isBlocked && (
                            <div className={`absolute top-1/2 -translate-y-1/2 ${isUser ? '-left-14' : '-right-8'} opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity`}>
                                {isEditable && (
                                    <button onClick={() => startEditing(msg)} className="p-1 text-slate-500 hover:text-emerald-400" title="Edit Message">
                                        <Pencil size={14} />
                                    </button>
                                )}
                                <button onClick={() => setActiveReactionMsgId(activeReactionMsgId === msg.id ? null : msg.id)} className="p-1 text-slate-500 hover:text-yellow-400" title="Add Reaction">
                                    <SmilePlus size={16}/>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {isBlocked ? (
          <div className="p-4 pb-8 bg-[#000000] z-20 flex flex-col items-center justify-center border-t border-white/5">
              <span className="text-slate-500 text-sm font-medium mb-2">You have blocked this contact.</span>
              <button onClick={handleBlockToggle} className="text-emerald-500 text-xs uppercase tracking-wider font-semibold hover:text-emerald-400">
                  Tap to Unblock
              </button>
          </div>
      ) : (
        <div className="p-2 pb-6 px-4 bg-[#000000] z-20">
            {attachment && (
                <div className="flex items-center gap-3 p-3 bg-[#1c1c1e] rounded-xl mb-2 border border-white/10 animate-in slide-in-from-bottom-2">
                    {attachment.type==='image' ? <img src={attachment.url} className="w-10 h-10 rounded object-cover"/> : <FileText size={24} className="text-slate-400"/>}
                    <span className="text-xs text-slate-300 truncate flex-1">{attachment.name}</span>
                    <button onClick={() => setAttachment(null)}><X size={16} className="text-slate-400 hover:text-red-400"/></button>
                </div>
            )}
            <div className="flex items-center gap-2 bg-[#1c1c1e] p-1.5 pl-3 rounded-full border border-white/10 focus-within:border-emerald-500/50 transition-colors shadow-lg">
                <button onClick={() => setIsCameraOpen(true)} className="text-slate-400 hover:text-emerald-400"><Camera size={22}/></button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()} className="text-slate-400 hover:text-emerald-400"><Paperclip size={20}/></button>
                <input value={inputText} onChange={(e) => setInputText(e.target.value)} onKeyDown={(e) => e.key==='Enter' && handleSend()} placeholder="Message..." className="flex-1 bg-transparent border-none outline-none text-white placeholder-slate-500 text-[15px]" />
                {inputText || attachment ? (
                    <button onClick={handleSend} className="bg-emerald-600 text-white p-2 rounded-full hover:bg-emerald-500 transition-all animate-in zoom-in duration-200"><Send size={18} className="ml-0.5"/></button>
                ) : (
                    <button className="text-slate-500 p-2"><Smile size={22}/></button>
                )}
            </div>
        </div>
      )}

      {/* Clear History Confirmation Modal */}
      {showClearConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-in fade-in duration-200">
            <div className="bg-[#1c1c1e] w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-white/10 scale-100 animate-in zoom-in-95 duration-200">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4 text-red-500">
                        <Trash2 size={24} />
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">Clear Chat History?</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Are you sure you want to delete all messages with <span className="text-white font-medium">{contact.name}</span>? This action cannot be undone.
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setShowClearConfirm(false)}
                        className="py-3 rounded-xl bg-slate-800 text-white font-medium hover:bg-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={confirmClear}
                        className="py-3 rounded-xl bg-red-600 text-white font-medium hover:bg-red-500 transition-colors shadow-lg shadow-red-900/20"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default SecureChat;
