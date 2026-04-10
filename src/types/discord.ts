export type User = {
  id: string;
  name: string;
  avatar: string;
  status: "online" | "idle" | "dnd" | "offline";
  customStatus?: string;
};

export type Message = {
  id: string;
  user: User;
  content: string;
  timestamp: string;
};

export type Channel = {
  id: string;
  name: string;
  type: "text" | "voice";
  unread?: boolean;
};