import { User, Message, Channel } from "../types/discord";

export const CURRENT_USER: User = {
  id: "u1",
  name: "DyadUser",
  avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Dyad",
  status: "online",
};

export const MOCK_USERS: User[] = [
  CURRENT_USER,
  { id: "u2", name: "Mario", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mario", status: "online", customStatus: "Sto programmando..." },
  { id: "u3", name: "Luigi", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Luigi", status: "idle" },
  { id: "u4", name: "Peach", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Peach", status: "dnd", customStatus: "Non disturbare" },
  { id: "u5", name: "Toad", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Toad", status: "offline" },
];

export const MOCK_CHANNELS: { category: string; channels: Channel[] }[] = [
  {
    category: "Informazioni",
    channels: [
      { id: "c1", name: "benvenuto", type: "text" },
      { id: "c2", name: "annunci", type: "text", unread: true },
    ],
  },
  {
    category: "Chat Generale",
    channels: [
      { id: "c3", name: "generale", type: "text" },
      { id: "c4", name: "off-topic", type: "text" },
      { id: "c5", name: "Lounge", type: "voice" },
    ],
  },
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