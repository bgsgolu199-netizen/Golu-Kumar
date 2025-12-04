

import { Contact, ChatMessage } from '../types';
import { STORAGE_KEY_USERNAME, MOCK_GLOBAL_USERS, STORAGE_KEY_BLOCKED, STORAGE_KEY_SUBSCRIPTION } from '../constants';

const GLOBAL_USERS_KEY = 'calcvault_global_users';

// --- WebSocket Simulation Layer ---
class SimulatedSocket {
    private channel: BroadcastChannel;
    private listeners: ((event: MessageEvent) => void)[] = [];

    constructor() {
        this.channel = new BroadcastChannel('calcvault_secure_network');
        this.channel.onmessage = (event) => {
            this.listeners.forEach(cb => cb(event));
        };
    }

    send(data: any) {
        // Broadcast to others
        this.channel.postMessage(data);
    }

    addEventListener(type: 'message', callback: (event: MessageEvent) => void) {
        if (type === 'message') {
            this.listeners.push(callback);
        }
    }
}

const socket = new SimulatedSocket();

// In-Memory Message Store & Presence State
let inMemoryMessages: any[] = [];
// Track dynamic status
let presenceState: Record<string, 'online' | 'offline' | 'busy'> = {};

const messageSubscribers: Set<() => void> = new Set();

// Blocking System Helpers
export const getBlockedUsers = (): string[] => {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_BLOCKED) || '[]');
};

export const blockUser = (username: string) => {
    const blocked = getBlockedUsers();
    if (!blocked.includes(username)) {
        blocked.push(username);
        localStorage.setItem(STORAGE_KEY_BLOCKED, JSON.stringify(blocked));
        notifySubscribers();
    }
};

export const unblockUser = (username: string) => {
    const blocked = getBlockedUsers();
    const newBlocked = blocked.filter(u => u !== username);
    localStorage.setItem(STORAGE_KEY_BLOCKED, JSON.stringify(newBlocked));
    notifySubscribers();
};

export const isUserBlocked = (username: string) => {
    return getBlockedUsers().includes(username);
};

// Initialize Socket Listener
socket.addEventListener('message', (event) => {
    const data = event.data;
    
    // --- BLOCKING FILTER ---
    let eventSender: string | null = null;
    
    if (data.type === 'CHAT_MESSAGE') {
        eventSender = data.payload.sender;
    } else if (data.type === 'PRESENCE_UPDATE') {
        eventSender = data.payload.username;
    } else if (data.type === 'READ_RECEIPT') {
        eventSender = data.payload.reader; 
    } else if (data.type === 'MESSAGE_EDIT') {
        const msg = inMemoryMessages.find(m => m.id === data.payload.id);
        if (msg) eventSender = msg.sender;
    }

    if (eventSender && isUserBlocked(eventSender)) {
        return;
    }
    // -----------------------

    if (data.type === 'CHAT_MESSAGE') {
        const newMsg = data.payload;
        inMemoryMessages.push(newMsg);
        notifySubscribers();
    } else if (data.type === 'PRESENCE_UPDATE') {
        const { username, status } = data.payload;
        presenceState[username] = status;
        notifySubscribers();
    } else if (data.type === 'READ_RECEIPT') {
        const { reader, originalSender } = data.payload;
        const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
        if (myName === originalSender) {
            markMyMessagesAsReadBy(reader);
        }
    } else if (data.type === 'MESSAGE_EDIT') {
        const { id, text } = data.payload;
        inMemoryMessages = inMemoryMessages.map(m => {
            if (m.id === id) {
                return { ...m, text, isEdited: true };
            }
            return m;
        });
        notifySubscribers();
    } else if (data.type === 'USER_JOINED') {
        // A new user has joined the network via Announce
        const user = data.payload;
        const localUsers = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
        if (!localUsers.find((u: any) => u.name === user.name)) {
            localUsers.push(user);
            localStorage.setItem(GLOBAL_USERS_KEY, JSON.stringify(localUsers));
        }
        sendPresenceUpdate('online');
    }
});

const notifySubscribers = () => {
    messageSubscribers.forEach(cb => cb());
};

// Helper: Update local messages when someone else reads them
const markMyMessagesAsReadBy = (reader: string) => {
    let changed = false;
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    inMemoryMessages.forEach(m => {
        if (m.sender === myName && m.receiver === reader && m.status !== 'read') {
            m.status = 'read';
            changed = true;
        }
    });
    if (changed) notifySubscribers();
};

export const subscribeToMessages = (callback: () => void) => {
    messageSubscribers.add(callback);
    return () => messageSubscribers.delete(callback);
};

export const announceExistence = () => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    const avatar = localStorage.getItem('calcvault_avatar');
    if (myName) {
        // Broadcast my existence to everyone on the network so they can add me
        socket.send({
            type: 'USER_JOINED',
            payload: { name: myName, avatar, status: 'online', bio: 'Verified User', isAi: false }
        });
    }
};

export const registerUser = (username: string, avatar: string | null) => {
    const users = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
    if (!users.find((u: any) => u.name === username)) {
        const newUser = { name: username, avatar, status: 'online', bio: 'Verified User', isAi: false };
        users.push(newUser);
        localStorage.setItem(GLOBAL_USERS_KEY, JSON.stringify(users));
        
        // Broadcast to others immediately
        socket.send({
            type: 'USER_JOINED',
            payload: newUser
        });
    }
    sendPresenceUpdate('online');
};

export const sendPresenceUpdate = (status: 'online' | 'busy' | 'offline') => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    if (!myName) return;
    
    // Update local state
    presenceState[myName] = status;
    notifySubscribers();

    // Broadcast to network
    socket.send({
        type: 'PRESENCE_UPDATE',
        payload: { username: myName, status }
    });
};

export const getLatestContactInfo = (contact: Contact): Contact => {
    // If blocked, always appear offline to me
    if (isUserBlocked(contact.name)) {
        return { ...contact, status: 'offline' };
    }

    // Check if there is a live presence update
    const liveStatus = presenceState[contact.name];
    if (liveStatus) {
        return { ...contact, status: liveStatus };
    }
    return contact;
};

export const searchUsers = (query: string): Contact[] => {
    const localUsers = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    
    // Only search local real users
    const allUsers = [...MOCK_GLOBAL_USERS, ...localUsers];
    
    return allUsers
        .filter(u => u.name.toLowerCase().includes(query.toLowerCase()) && u.name !== myName)
        .map(u => ({
            id: u.name,
            name: u.name,
            status: isUserBlocked(u.name) ? 'offline' : (presenceState[u.name] || u.status || 'offline'),
            avatar: u.avatar,
            bio: u.bio,
            isAi: false // No AI users allowed
        }));
};

export const sendMessage = (text: string, receiver: string, attachment?: any, senderOverride?: string) => {
    const currentUser = localStorage.getItem(STORAGE_KEY_USERNAME);
    const sender = senderOverride || currentUser;
    
    if (!sender) return;

    if (isUserBlocked(receiver) && !senderOverride) {
        return; 
    }

    const newMsg = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        text,
        sender,
        receiver: senderOverride ? currentUser : receiver, 
        timestamp: Date.now(),
        attachment,
        status: 'sent',
        isEdited: false
    };
    
    inMemoryMessages.push(newMsg);
    notifySubscribers();

    if (!senderOverride) {
        socket.send({ type: 'CHAT_MESSAGE', payload: newMsg });
        sendPresenceUpdate('online'); 
    }
    
    return newMsg;
};

export const markMessagesAsRead = (senderName: string) => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    if (!myName) return;
    
    if (isUserBlocked(senderName)) return;

    let changed = false;
    inMemoryMessages.forEach(m => {
        if (m.sender === senderName && m.receiver === myName && m.status !== 'read') {
            m.status = 'read';
            changed = true;
        }
    });
    
    if (changed) {
        notifySubscribers();
        socket.send({
            type: 'READ_RECEIPT',
            payload: { reader: myName, originalSender: senderName }
        });
    }
};

export const getConversation = (contactName: string): ChatMessage[] => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    if (!myName) return [];

    return inMemoryMessages
        .filter((m: any) => 
            (m.sender === myName && m.receiver === contactName) ||
            (m.sender === contactName && m.receiver === myName)
        )
        .map((m: any) => ({
            id: m.id,
            role: m.sender === myName ? 'user' : 'model', // 'model' here just means 'other person' in this context
            text: m.text,
            timestamp: m.timestamp,
            attachment: m.attachment,
            reaction: m.reaction, 
            sender: m.sender,
            receiver: m.receiver,
            isEdited: m.isEdited,
            status: m.status
        }));
};

export const updateMessageReaction = (msgId: string, reaction: string | undefined) => {
    inMemoryMessages = inMemoryMessages.map((m: any) => {
        if (m.id === msgId) {
            return { ...m, reaction };
        }
        return m;
    });
    notifySubscribers();
};

export const editMessage = (msgId: string, newText: string) => {
    inMemoryMessages = inMemoryMessages.map((m: any) => {
        if (m.id === msgId) {
            return { ...m, text: newText, isEdited: true };
        }
        return m;
    });
    notifySubscribers();

    socket.send({
        type: 'MESSAGE_EDIT',
        payload: { id: msgId, text: newText }
    });
};

export const clearHistory = (contactName: string) => {
    const myName = localStorage.getItem(STORAGE_KEY_USERNAME);
    inMemoryMessages = inMemoryMessages.filter((m: any) => 
        !((m.sender === myName && m.receiver === contactName) || 
          (m.sender === contactName && m.receiver === myName))
    );
    notifySubscribers();
};

export const activateSubscription = () => {
    localStorage.setItem(STORAGE_KEY_SUBSCRIPTION, 'true');
};

// --- ADMIN PANEL FUNCTIONS ---

export const getSystemStats = () => {
    const localUsers = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
    const totalUsers = localUsers.length;
    const activeUsers = Object.values(presenceState).filter(s => s === 'online').length;
    
    return {
        totalMessages: inMemoryMessages.length,
        totalUsers,
        activeUsers,
        serverTime: new Date().toISOString(),
        memoryUsage: Math.floor(Math.random() * 40) + 10 + 'MB' // Mock
    };
};

export const getAllUsers = () => {
    const localUsers = JSON.parse(localStorage.getItem(GLOBAL_USERS_KEY) || '[]');
    return [...localUsers].map((u: any) => ({
        ...u,
        status: presenceState[u.name] || u.status || 'offline',
        isBlocked: isUserBlocked(u.name)
    }));
};

export const getAllMessages = () => {
    return [...inMemoryMessages];
};

export const sendSystemBroadcast = (message: string) => {
    const broadcastMsg = {
        id: 'sys-' + Date.now(),
        text: `⚠️ SYSTEM ALERT: ${message}`,
        sender: 'System_Admin',
        receiver: 'ALL',
        timestamp: Date.now(),
        status: 'sent'
    };

    inMemoryMessages.push(broadcastMsg);
    notifySubscribers();

    socket.send({ type: 'CHAT_MESSAGE', payload: broadcastMsg });
};

export const nukeSystem = () => {
    localStorage.clear();
    location.reload();
};
