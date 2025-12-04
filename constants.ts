
export const PIN_LENGTH = 4;
export const STORAGE_KEY_PIN = 'calcvault_secure_pin';
export const STORAGE_KEY_IS_SETUP = 'calcvault_is_setup';
export const STORAGE_KEY_USERNAME = 'calcvault_username';
export const STORAGE_KEY_AVATAR = 'calcvault_avatar';
export const STORAGE_KEY_CONTACTS = 'calcvault_contacts';
export const STORAGE_KEY_SECRET_CODE = 'calcvault_secret_code';
export const STORAGE_KEY_BLOCKED = 'calcvault_blocked_users';
export const STORAGE_KEY_SUBSCRIPTION = 'calcvault_subscription';

export const ADMIN_CODE = '9999';

// Base Gemini System Instruction
export const BASE_CHAT_INSTRUCTION = `You are a secure, encrypted communication assistant inside a hidden vault app. 
- Keep your responses concise, professional, and privacy-focused. 
- Act as if you are communicating over a highly classified line.
- Do not mention that you are an AI if possible.`;

// Empty list - Only real users allowed.
export const MOCK_GLOBAL_USERS: { id: string, name: string, status: string, bio: string, avatar: string, isAi: boolean }[] = [];
