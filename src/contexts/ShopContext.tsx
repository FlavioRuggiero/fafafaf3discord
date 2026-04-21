import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SHOP_ITEMS, ShopItem } from '@/data/shopItems';

export type CustomElement = {
  id: string;
  type: 'emoji' | 'image';
  content: string;
  animation: string;
  x: number;
  y: number;
  size: number;
  delay: number;
};

export type BaseEffectConfig = {
  id: string;
  type: string;
  color1: string;
  color2: string;
  icon: string;
  x?: number;
  y?: number;
  rotation?: number;
};

export type CustomDecoration = {
  id: string;
  name: string;
  price: number;
  category: string;
  image_url: string | null;
  border_color: string;
  shadow_color: string;
  text_color_type: 'solid' | 'gradient';
  text_color: string;
  text_gradient_start: string;
  text_gradient_end: string;
  animation_type: string;
  config: {
    baseEffect?: string; // Legacy
    effectColor1?: string; // Legacy
    effectColor2?: string; // Legacy
    baseEffects?: BaseEffectConfig[]; // Nuovo sistema
    elements?: CustomElement[];
  };
};

type ShopContextType = {
  customDecorations: CustomDecoration[];
  allItems: ShopItem[];
  refreshCustomDecorations: () => Promise<void>;
  getThemeStyle: (id: string | null | undefined) => React.CSSProperties;
  getThemeClass: (id: string | null | undefined) => string;
};

const ShopContext = createContext<ShopContextType | null>(null);

export const ShopProvider = ({ children }: { children: React.ReactNode }) => {
  const [customDecorations, setCustomDecorations] = useState<CustomDecoration[]>([]);

  const refreshCustomDecorations = async () => {
    const { data } = await supabase.from('custom_decorations').select('*');
    if (data) setCustomDecorations(data);
  };

  useEffect(() => {
    refreshCustomDecorations();
  }, []);

  const allItems: ShopItem[] = [
    ...SHOP_ITEMS,
    ...customDecorations.map(cd => ({
      id: cd.id,
      name: cd.name,
      price: cd.price,
      type: 'decoration' as const,
      category: cd.category,
    }))
  ];

  const getThemeClass = (id: string | null | undefined) => {
    if (!id) return '';
    switch(id) {
      case 'supernova': return 'theme-text-supernova';
      case 'esquelito': return 'theme-text-esquelito';
      case 'oceanic': return 'theme-text-oceanic';
      case 'saturn-fire': return 'theme-text-saturn-fire';
      case 'gustavo-armando': return 'theme-text-gustavo';
      case 'serpixel-agitato': return 'theme-text-serpixel-agitato';
      default: return '';
    }
  };

  const getThemeStyle = (id: string | null | undefined): React.CSSProperties => {
    if (!id) return {};
    const custom = customDecorations.find(c => c.id === id);
    if (custom) {
      if (custom.text_color_type === 'solid') {
        return {
          color: custom.text_color,
          textShadow: `0 0 10px ${custom.text_color}80`
        };
      } else {
        return {
          background: `linear-gradient(90deg, ${custom.text_gradient_start || '#fff'}, ${custom.text_gradient_end || '#fff'})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: `0 0 15px ${custom.text_gradient_start || '#fff'}80`
        };
      }
    }
    return {};
  };

  return (
    <ShopContext.Provider value={{ customDecorations, allItems, refreshCustomDecorations, getThemeStyle, getThemeClass }}>
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error("useShop must be used within ShopProvider");
  return context;
};