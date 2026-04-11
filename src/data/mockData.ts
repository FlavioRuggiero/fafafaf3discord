import { User, Message, Channel, Server } from "../types/discord";

export const CURRENT_USER: User = {
  id: "u1",
  name: "DyadUser",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dyad",
  status: "online",
  global_role: "CREATOR", // Default to CREATOR to allow testing server creation
  level: 10,
  digitalcardus: 250,
  xp: 35
};

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  { id: "u2", name: "Mario", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mario", status: "online", customStatus: "Sto programmando...", level: 5, digitalcardus: 100, xp: 12 },
  { id: "u3", name: "Luigi", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luigi", status: "idle", level: 2, digitalcardus: 25, xp: 4 },
];

export const MOCK_SERVERS: Server[] = [
  { id: "s1", name: "Dyad Community", created_by: "u1", icon_url: "https://api.dicebear.com/7.x/shapes/svg?seed=home", description: "Il server ufficiale di Dyad." },
  { id: "s2", name: "Gaming Hub", created_by: "u2", icon_url: "https://api.dicebear.com/7.x/identicon/svg?seed=gaming", description: "Per tutti i videogiocatori!" },
  { id: "s3", name: "Designers", created_by: "u3", icon_url: "https://api.dicebear.com/7.x/bottts/svg?seed=design", description: "UI/UX e Grafica." },
];

export const MOCK_CHANNELS: Channel[] = [
  { id: "c1", server_id: "s1", name: "benvenuto", type: "text", category: "Informazioni" },
  { id: "c2", server_id: "s1", name: "annunci", type: "text", category: "Informazioni", unread: true },
  { id: "c3", server_id: "s1", name: "generale", type: "text", category: "Chat Generale" },
  { id: "c4", server_id: "s1", name: "Lounge", type: "voice", category: "Chat Generale" },
  
  { id: "c5", server_id: "s2", name: "general-gaming", type: "text", category: "Generale" },
  { id: "c6", server_id: "s2", name: "Fortnite", type: "voice", category: "Vocali" },
  
  { id: "c7", server_id: "s3", name: "ispirazione", type: "text", category: "Design" },
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: "m1",
    user: MOCK_USERS[1],
    content: "Benvenuti nel nuovo server! Come vi sembra l'interfaccia?",
    timestamp: "Oggi alle 10:24",
  },
  {
    id: "m2",
    user: MOCK_USERS[2],
    content: "Molto pulita, mi piace il tema scuro.",
    timestamp: "Oggi alle 10:25",
  },
];