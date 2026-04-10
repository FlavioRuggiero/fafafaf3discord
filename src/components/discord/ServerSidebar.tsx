import React from "react";
import { Plus, Compass, Download } from "lucide-react";

const ServerIcon = ({ image, name, active, notify }: { image?: string, name?: string, active?: boolean, notify?: boolean }) => (
  <div className="relative group flex items-center justify-center cursor-pointer mb-2">
    <div className={`absolute left-0 w-1 bg-white rounded-r-lg transition-all duration-300 ${active ? 'h-10' : 'h-0 group-hover:h-5'} ${notify && !active ? 'h-2' : ''}`} />
    
    <div className={`w-12 h-12 flex items-center justify-center overflow-hidden transition-all duration-300 ${active ? 'rounded-2xl bg-brand' : 'rounded-[24px] group-hover:rounded-2xl bg-[#313338] group-hover:bg-brand text-[#dbdee1] group-hover:text-white'}`}>
      {image ? (
        <img src={image} alt="Server" className="w-full h-full object-cover" />
      ) : (
        <span className="font-medium text-lg">{name}</span>
      )}
    </div>
  </div>
);

const IconButton = ({ icon: Icon, colorClass = "text-[#23a559] group-hover:bg-[#23a559] group-hover:text-white" }: { icon: any, colorClass?: string }) => (
  <div className="relative group flex items-center justify-center cursor-pointer mb-2">
    <div className={`w-12 h-12 rounded-[24px] group-hover:rounded-2xl bg-[#313338] flex items-center justify-center transition-all duration-300 ${colorClass}`}>
      <Icon size={24} />
    </div>
  </div>
);

export const ServerSidebar = () => {
  return (
    <div className="w-[72px] bg-[#1e1f22] flex flex-col items-center py-3 flex-shrink-0 z-20">
      <ServerIcon image="https://api.dicebear.com/7.x/shapes/svg?seed=home" active />
      
      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-2" />
      
      <ServerIcon image="https://api.dicebear.com/7.x/identicon/svg?seed=gaming" notify />
      <ServerIcon name="DY" />
      <ServerIcon image="https://api.dicebear.com/7.x/bottts/svg?seed=tech" />
      
      <div className="w-8 h-[2px] bg-[#35363c] rounded-full my-2" />
      
      <IconButton icon={Plus} />
      <IconButton icon={Compass} colorClass="text-[#dbdee1] group-hover:bg-[#dbdee1] group-hover:text-[#1e1f22]" />
      
      <div className="mt-auto">
        <IconButton icon={Download} colorClass="text-[#dbdee1] group-hover:bg-[#dbdee1] group-hover:text-[#1e1f22]" />
      </div>
    </div>
  );
};