export type ShopItem = {
  id: string;
  name: string;
  price: number;
  type: 'decoration' | 'emoji_pack' | 'privilege' | 'consumable' | 'cursor';
  category: string;
  emojis?: string[];
  description?: string;
  creator_id?: string;
};

export const SHOP_ITEMS: ShopItem[] = [
  { id: 'pulse-red', name: 'Contorno Rosso Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-gray', name: 'Contorno Grigio Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-green', name: 'Contorno Verde Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-pink', name: 'Contorno Rosa Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-yellow', name: 'Contorno Giallo Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-purple', name: 'Contorno Viola Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-orange', name: 'Contorno Arancione Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'pulse-blue', name: 'Contorno Blu Pulsante', price: 20, type: 'decoration', category: 'Contorni' },
  { id: 'circo', name: 'Circo', price: 30, type: 'decoration', category: 'Contorni' },
  { id: 'hazard', name: 'Nastro Pericolo', price: 30, type: 'decoration', category: 'Contorni' },
  { id: 'puzzle', name: 'Puzzle', price: 35, type: 'decoration', category: 'Contorni' },
  { id: 'radar', name: 'Radar', price: 40, type: 'decoration', category: 'Contorni' },
  { id: 'twin-rings', name: 'Anelli Gemelli', price: 45, type: 'decoration', category: 'Contorni' },
  { id: 'electric', name: 'Contorno Elettrico', price: 50, type: 'decoration', category: 'Contorni' },
  { id: 'hands', name: 'Mani Salutanti', price: 50, type: 'decoration', category: 'Contorni' },
  { id: 'dc-emit', name: 'Emanazione Digitalcardus', price: 70, type: 'decoration', category: 'Contorni' },
  { id: 'rays', name: 'Raggi Elettrici', price: 80, type: 'decoration', category: 'Contorni' },
  { id: 'matrix', name: 'Hacker Matrix', price: 85, type: 'decoration', category: 'Contorni' },
  { id: 'explosive', name: 'Esplosivo Caotico', price: 100, type: 'decoration', category: 'Contorni' },
  { id: 'holographic', name: 'Riflesso Olografico', price: 100, type: 'decoration', category: 'Contorni' },
  
  // Nuovi contorni intermedi
  { id: 'tempesta', name: 'Tempesta', price: 120, type: 'decoration', category: 'Contorni' },
  { id: 'ghiacciolo', name: 'Ghiacciolo', price: 120, type: 'decoration', category: 'Contorni' },

  { id: 'esquelito', name: 'Esquelito Explosivo', price: 250, type: 'decoration', category: 'Contorni Premium' },
  { id: 'supernova', name: 'Supernova Cosmica', price: 250, type: 'decoration', category: 'Contorni Premium' },
  { id: 'oceanic', name: 'Vortice Oceanico', price: 250, type: 'decoration', category: 'Contorni Premium' },
  { id: 'saturn-fire', name: 'Saturno a Fuoco', price: 250, type: 'decoration', category: 'Contorni Premium' },
  { id: 'gustavo-armando', name: 'Gustavo armando', price: 300, type: 'decoration', category: 'Contorni Premium' },
  { id: 'serpixel-agitato', name: 'Serpixel Agitato', price: 300, type: 'decoration', category: 'Contorni Premium' },
  
  // Cursori
  { id: 'cursor-neon', name: 'Cursore Neon', price: 100, type: 'cursor', category: 'Cursori' },
  { id: 'cursor-flame', name: 'Cursore Fiamma', price: 120, type: 'cursor', category: 'Cursori' },
  { id: 'cursor-magic', name: 'Cursore Magico', price: 140, type: 'cursor', category: 'Cursori' },
  { id: 'cursor-sword', name: 'Cursore Spada', price: 150, type: 'cursor', category: 'Cursori' },
  { id: 'cursor-dragon', name: 'Dragone Cinese', price: 300, type: 'cursor', category: 'Cursori Premium' },

  // Privilegi
  { 
    id: 'privilege-banner', 
    name: 'Banner Modificabile', 
    price: 500, 
    type: 'privilege', 
    category: 'Privilegi',
    description: 'Ti permette di caricare un\'immagine o una GIF personalizzata come banner del tuo profilo, anche se non sei Admin.'
  },
  { 
    id: 'privilege-welcome', 
    name: 'Il mio benvenuto', 
    price: 500, 
    type: 'privilege', 
    category: 'Privilegi',
    description: 'Personalizza il testo, il colore di sfondo e del bordo del messaggio che appare automaticamente quando entri in un server.'
  },
  { 
    id: 'privilege-daily-bonus', 
    name: 'Bonus Giornaliero', 
    price: 500, 
    type: 'privilege', 
    category: 'Privilegi',
    description: 'Ottieni un bonus del 20% sui guadagni in XP e Digitalcardus del premio giornaliero.'
  },
  { 
    id: 'privilege-entrance-audio', 
    name: 'Entrata in scena', 
    price: 500, 
    type: 'privilege', 
    category: 'Privilegi',
    description: 'Permette di registrare o caricare un audio (max 2s) che verrà riprodotto quando entri in un canale vocale.'
  },

  // Oggetti Speciali (Consumabili)
  {
    id: 'custom-dec-ticket',
    name: 'Contorno personalizzato',
    price: 750,
    type: 'consumable',
    category: 'Speciali',
    description: 'Questo oggetto ti permette di creare un tuo contorno personalizzato.'
  },

  // Pacchetti Emoji
  { 
    id: 'emoji-pack-1', 
    name: 'Pacchetto Emoj vettoriali Vol. 1', 
    price: 50, 
    type: 'emoji_pack', 
    category: 'Pacchetti Emoji', 
    emojis: [
      "/emojis/Angry face 64.png", "/emojis/Angry face with horns 64.png", "/emojis/Anguished face 64.png", "/emojis/Anxious face with sweat 64.png",
      "/emojis/Astonished face 64.png", "/emojis/Beaming face with smiling eyes 64.png", "/emojis/Clown face 64.png", "/emojis/Cold face 64.png",
      "/emojis/Confounded face 64.png", "/emojis/Confused face 64.png", "/emojis/Cowboy hat face 64.png", "/emojis/Crying face 64.png",
      "/emojis/Disappointed face 64.png", "/emojis/Disguised face 64.png", "/emojis/Dizzy face 64.png", "/emojis/Dotted line face 64.png"
    ] 
  },
  { 
    id: 'emoji-pack-2', 
    name: 'Pacchetto Emoj vettoriali Vol. 2', 
    price: 50, 
    type: 'emoji_pack', 
    category: 'Pacchetti Emoji', 
    emojis: [
      "/emojis/Downcase face with sweat 64.png", "/emojis/Drooling face 64.png", "/emojis/Exploding head 64.png", "/emojis/Expressionless face 64.png",
      "/emojis/Face blowing a kiss 64.png", "/emojis/Face exhaling 64.png", "/emojis/Face holding back tears 64.png", "/emojis/Face in clouds 64.png",
      "/emojis/Face savoring food 64.png", "/emojis/Face screaming in fear 64.png", "/emojis/Face vomiting 64.png", "/emojis/Face with diagonal mouth 64.png",
      "/emojis/Face with hand over mouth 64.png", "/emojis/Face with head bandage 64.png", "/emojis/Face with medical mask 64.png", "/emojis/Face with monocle 64.png"
    ] 
  },
  { 
    id: 'emoji-pack-3', 
    name: 'Pacchetto Emoj vettoriali Vol. 3', 
    price: 50, 
    type: 'emoji_pack', 
    category: 'Pacchetti Emoji', 
    emojis: [
      "/emojis/Face with open eyes and hand over mouth 64.png", "/emojis/Face with open mouth 64.png", "/emojis/Face with peeking eye 64.png", "/emojis/Face with raised eyebrow 64.png",
      "/emojis/Face with rolling eyes 64.png", "/emojis/Face with spiral eyes 64.png", "/emojis/Face with steam from nose 64.png", "/emojis/Face with symbols on mouth 64.png",
      "/emojis/Face with tears of joy 64.png", "/emojis/Face with thermometer 64.png", "/emojis/Face with tongue 64.png", "/emojis/Face without mouth 64.png",
      "/emojis/Fearful face 64.png", "/emojis/Flushed face 64.png", "/emojis/Frowning face 64.png", "/emojis/Frowning face with open mouth 64.png"
    ] 
  },
  { 
    id: 'emoji-pack-4', 
    name: 'Pacchetto Emoj vettoriali Vol. 4', 
    price: 50, 
    type: 'emoji_pack', 
    category: 'Pacchetti Emoji', 
    emojis: [
      "/emojis/Grimacing face 64.png", "/emojis/Grinning face 64.png", "/emojis/Grinning face with big eyes 64.png", "/emojis/Grinning face with smiling eyes 64.png",
      "/emojis/Grinning face with sweat 64.png", "/emojis/Grinning squinting face 64.png", "/emojis/Head shaking horizontally 64.png", "/emojis/Head shaking vertically 64.png",
      "/emojis/Hot face 64.png", "/emojis/Hugging face 64.png", "/emojis/Hushed face 64.png", "/emojis/Kissing face 64.png",
      "/emojis/Kissing face with closed eyes 64.png", "/emojis/Kissing face with smiling eyes 64.png", "/emojis/Loudly crying face 64.png", "/emojis/Lying face 64.png"
    ] 
  },
  { 
    id: 'emoji-pack-5', 
    name: 'Pacchetto Emoj vettoriali Vol. 5', 
    price: 50, 
    type: 'emoji_pack', 
    category: 'Pacchetti Emoji', 
    emojis: [
      "/emojis/Melting face 64.png", "/emojis/Mewing face 64.png", "/emojis/Money mouth face 64.png", "/emojis/Nauseated face 64.png",
      "/emojis/Nerd face 64.png", "/emojis/Neutral face 64.png", "/emojis/Partying face 64.png", "/emojis/Pensive face 64.png",
      "/emojis/Persevering face 64.png", "/emojis/Pile of poo 64.png", "/emojis/Pleading face 64.png", "/emojis/Pouting face 64.png",
      "/emojis/Relieved face 64.png", "/emojis/Robot 64.png", "/emojis/Rolling on the floor laughing 64.png", "/emojis/Sad but relieved face 64.png"
    ] 
  },
  { 
    id: 'emoji-pack-6', 
    name: 'Pacchetto Emoj vettoriali Vol. 6', 
    price: 50, 
    type: 'emoji_pack', 
    category: 'Pacchetti Emoji', 
    emojis: [
      "/emojis/Saluting face 64.png", "/emojis/Shaking face 64.png", "/emojis/Shushing face 64.png", "/emojis/Skull 64.png",
      "/emojis/Sleeping face 64.png", "/emojis/Sleepy face 64.png", "/emojis/Slightly frowning face 64.png", "/emojis/Slightly smiling face 64.png",
      "/emojis/Smiling face 64.png", "/emojis/Smiling face with halo 64.png", "/emojis/Smiling face with heart-eyes 64.png", "/emojis/Smiling face with hearts 64.png",
      "/emojis/Smiling face with horns 64.png", "/emojis/Smiling face with smiling eyes 64.png", "/emojis/Smiling face with sunglasses 64.png", "/emojis/Smiling face with tear 64.png"
    ] 
  },
  { 
    id: 'emoji-pack-7', 
    name: 'Pacchetto Emoj vettoriali Vol. 7', 
    price: 50, 
    type: 'emoji_pack', 
    category: 'Pacchetti Emoji', 
    emojis: [
      "/emojis/Smirking face 64.png", "/emojis/Sneezing face 64.png", "/emojis/Squinting face with tongue 64.png", "/emojis/Star-struck 64.png",
      "/emojis/Thinking face 64.png", "/emojis/Tired face 64.png", "/emojis/Unamused face 64.png", "/emojis/Upside-down face 64.png",
      "/emojis/Weary face 64.png", "/emojis/Winking face 64.png", "/emojis/Winking face with tongue 64.png", "/emojis/Woozy face 64.png",
      "/emojis/Worried face 64.png", "/emojis/Yawning face 64.png", "/emojis/Zany face 64.png", "/emojis/Zipper-mouth face 64.png"
    ] 
  },
];