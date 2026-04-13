export type ShopItem = {
  id: string;
  name: string;
  price: number;
  type: 'decoration' | 'emoji_pack';
  category: string;
  emojis?: string[];
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'pulse-red', name: 'Contorno Rosso Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-gray', name: 'Contorno Grigio Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-green', name: 'Contorno Verde Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-pink', name: 'Contorno Rosa Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'hazard', name: 'Nastro Pericolo', price: 30, type: 'decoration', category: 'Contorni' },
  { id: 'electric', name: 'Contorno Elettrico', price: 50, type: 'decoration', category: 'Contorni' },
  { id: 'hands', name: 'Mani Salutanti', price: 50, type: 'decoration', category: 'Contorni' },
  { id: 'dc-emit', name: 'Emanazione Digitalcardus', price: 70, type: 'decoration', category: 'Contorni' },
  { id: 'rays', name: 'Raggi Elettrici', price: 80, type: 'decoration', category: 'Contorni' },
  { id: 'matrix', name: 'Hacker Matrix', price: 85, type: 'decoration', category: 'Contorni' },
  { id: 'explosive', name: 'Esplosivo Caotico', price: 100, type: 'decoration', category: 'Contorni' },
  { id: 'holographic', name: 'Riflesso Olografico', price: 100, type: 'decoration', category: 'Contorni' },
  { id: 'esquelito', name: 'Esquelito Explosivo', price: 250, type: 'decoration', category: 'Contorni Premium' },
  { id: 'supernova', name: 'Supernova Cosmica', price: 250, type: 'decoration', category: 'Contorni Premium' },
  { id: 'oceanic', name: 'Vortice Oceanico', price: 250, type: 'decoration', category: 'Contorni Premium' },
  { id: 'saturn-fire', name: 'Saturno a Fuoco', price: 250, type: 'decoration', category: 'Contorni Premium' },
  
  // Pacchetti Emoji
  { id: 'emoji-pack-1', name: 'Pacchetto Emoji Vol. 1', price: 150, type: 'emoji_pack', category: 'Pacchetti Emoji', emojis: Array.from({length: 16}, (_, i) => `/emojis/${i + 1}.png`) },
  { id: 'emoji-pack-2', name: 'Pacchetto Emoji Vol. 2', price: 150, type: 'emoji_pack', category: 'Pacchetti Emoji', emojis: Array.from({length: 16}, (_, i) => `/emojis/${i + 17}.png`) },
  { id: 'emoji-pack-3', name: 'Pacchetto Emoji Vol. 3', price: 150, type: 'emoji_pack', category: 'Pacchetti Emoji', emojis: Array.from({length: 16}, (_, i) => `/emojis/${i + 33}.png`) },
  { id: 'emoji-pack-4', name: 'Pacchetto Emoji Vol. 4', price: 150, type: 'emoji_pack', category: 'Pacchetti Emoji', emojis: Array.from({length: 16}, (_, i) => `/emojis/${i + 49}.png`) },
  { id: 'emoji-pack-5', name: 'Pacchetto Emoji Vol. 5', price: 150, type: 'emoji_pack', category: 'Pacchetti Emoji', emojis: Array.from({length: 16}, (_, i) => `/emojis/${i + 65}.png`) },
  { id: 'emoji-pack-6', name: 'Pacchetto Emoji Vol. 6', price: 150, type: 'emoji_pack', category: 'Pacchetti Emoji', emojis: Array.from({length: 16}, (_, i) => `/emojis/${i + 81}.png`) },
  { id: 'emoji-pack-7', name: 'Pacchetto Emoji Vol. 7', price: 150, type: 'emoji_pack', category: 'Pacchetti Emoji', emojis: Array.from({length: 16}, (_, i) => `/emojis/${i + 97}.png`) },
];