import React, { useState, useEffect } from "react";
import { Users, Search, Check, X, MessageSquare } from "lucide-react";
import { User, Friendship } from "@/types/discord";
import { supabase } from "@/integrations/supabase/client";
import { showError, showSuccess } from "@/utils/toast";
import { playSound } from "@/utils/sounds";

interface FriendsAreaProps {
  currentUser: User;
  onStartDM: (userId: string) => void;
  onlineUserIds: Set<string>;
}

export const FriendsArea = ({ currentUser, onStartDM, onlineUserIds }: FriendsAreaProps) => {
  const [activeTab, setActiveTab] = useState<'online' | 'all' | 'pending' | 'add'>('online');
  const [searchQuery, setSearchQuery] = useState("");
  const [addFriendQuery, setAddFriendQuery] = useState("");
  
  const [friendships, setFriendships] = useState<(Friendship & { otherUser: User })[]>([]);
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const fetchFriendships = async () => {
    const { data, error } = await supabase
      .from('friendships')
      .select('*')
      .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

    if (error || !data) return;

    const otherUserIds = data.map(f => f.sender_id === currentUser.id ? f.receiver_id : f.sender_id);
    
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', otherUserIds);

    const formatted = data.map(f => {
      const otherId = f.sender_id === currentUser.id ? f.receiver_id : f.sender_id;
      const p = profiles?.find(p => p.id === otherId);
      
      const user: User = {
        id: otherId,
        name: p?.first_name || 'Utente',
        avatar: p?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${otherId}`,
        status: onlineUserIds.has(otherId) ? 'online' : 'offline',
        bio: p?.bio || undefined,
        banner_color: p?.banner_color || undefined,
        banner_url: p?.banner_url || undefined,
        level: p?.level || 1,
        digitalcardus: p?.digitalcardus || 25,
        xp: p?.xp || 0
      };

      return { ...f, otherUser: user };
    });

    setFriendships(formatted);
  };

  useEffect(() => {
    fetchFriendships();

    const sub = supabase.channel('friendships_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships' }, () => {
        fetchFriendships();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [currentUser.id, onlineUserIds]);

  const handleAddFriend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addFriendQuery.trim()) return;

    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .ilike('first_name', `%${addFriendQuery}%`)
      .neq('id', currentUser.id)
      .limit(10);

    if (profiles) {
      const users: User[] = profiles.map(p => ({
        id: p.id,
        name: p.first_name || 'Utente',
        avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`,
        status: onlineUserIds.has(p.id) ? 'online' : 'offline',
        level: p.level,
        digitalcardus: p.digitalcardus,
        xp: p.xp
      }));
      setSearchResults(users);
    }
  };

  const sendFriendRequest = async (targetId: string) => {
    const { error } = await supabase.from('friendships').insert({
      sender_id: currentUser.id,
      receiver_id: targetId,
      status: 'pending'
    });

    if (error) {
      if (error.code === '23505') showError("Richiesta di amicizia già inviata o siete già amici.");
      else showError("Errore durante l'invio della richiesta.");
    } else {
      playSound('/notifica.mp3');
      showSuccess("Richiesta di amicizia inviata!");
      setAddFriendQuery("");
      setSearchResults([]);
    }
  };

  const acceptRequest = async (friendshipId: string) => {
    // Aggiornamento ottimistico per UI istantanea
    setFriendships(prev => prev.map(f => f.id === friendshipId ? { ...f, status: 'accepted' } : f));
    
    const { error } = await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
    if (error) {
      showError("Errore durante l'accettazione.");
      fetchFriendships(); // Ripristina in caso di errore
    }
  };

  const declineRequest = async (friendshipId: string) => {
    // Aggiornamento ottimistico
    setFriendships(prev => prev.filter(f => f.id !== friendshipId));
    
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) {
      showError("Errore durante il rifiuto.");
      fetchFriendships();
    }
  };

  const removeFriend = async (friendshipId: string) => {
    const friendship = friendships.find(f => f.id === friendshipId);
    if (!friendship) return;
    const friendId = friendship.otherUser.id;

    // Aggiornamento ottimistico
    setFriendships(prev => prev.filter(f => f.id !== friendshipId));
    
    const { error } = await supabase.from('friendships').delete().eq('id', friendshipId);
    if (error) {
      showError("Errore durante la rimozione.");
      fetchFriendships();
      return;
    }

    // Elimina anche la chat DM se esiste
    const { data: dmChannel } = await supabase
      .from('dm_channels')
      .select('id')
      .or(`and(user1_id.eq.${currentUser.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${currentUser.id})`)
      .maybeSingle();

    if (dmChannel) {
      const { error: dmError } = await supabase.from('dm_channels').delete().eq('id', dmChannel.id);
      if (dmError) {
        console.error("Errore eliminazione DM:", dmError);
      }
    }
    
    showSuccess("Amicizia e chat rimosse.");
  };

  const pendingRequests = friendships.filter(f => f.status === 'pending');
  const acceptedFriends = friendships.filter(f => f.status === 'accepted');
  const onlineFriends = acceptedFriends.filter(f => f.otherUser.status === 'online');

  const filteredFriends = (activeTab === 'online' ? onlineFriends : acceptedFriends).filter(f => 
    f.otherUser.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#313338]">
      <div className="h-12 border-b border-[#1f2023] shadow-sm flex items-center px-4 flex-shrink-0">
        <div className="flex items-center text-[#dbdee1] mr-4 border-r border-[#3f4147] pr-4">
          <Users size={20} className="mr-2 text-[#949ba4]" />
          <span className="font-semibold">Amici</span>
        </div>
        <div className="flex space-x-4">
          <button 
            onClick={() => setActiveTab('online')}
            className={`px-2 py-0.5 rounded text-sm font-medium ${activeTab === 'online' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#3f4147] hover:text-[#dbdee1]'}`}
          >
            Disponibili
          </button>
          <button 
            onClick={() => setActiveTab('all')}
            className={`px-2 py-0.5 rounded text-sm font-medium ${activeTab === 'all' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#3f4147] hover:text-[#dbdee1]'}`}
          >
            Tutti
          </button>
          <button 
            onClick={() => setActiveTab('pending')}
            className={`px-2 py-0.5 rounded text-sm font-medium ${activeTab === 'pending' ? 'bg-[#404249] text-white' : 'text-[#b5bac1] hover:bg-[#3f4147] hover:text-[#dbdee1]'}`}
          >
            In attesa
            {pendingRequests.length > 0 && (
              <span className="ml-1.5 bg-[#f23f43] text-white text-[10px] px-1.5 py-0.5 rounded-full">{pendingRequests.length}</span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('add')}
            className={`px-2 py-0.5 rounded text-sm font-medium ${activeTab === 'add' ? 'bg-transparent text-[#23a559]' : 'bg-[#23a559] text-white hover:bg-[#1a7f44]'}`}
          >
            Aggiungi amico
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
        {activeTab === 'add' ? (
          <div className="max-w-[600px]">
            <h2 className="text-white font-bold mb-2 uppercase text-sm">Aggiungi Amico</h2>
            <p className="text-[#b5bac1] text-sm mb-4">Puoi aggiungere amici tramite il loro Nome Utente.</p>
            <form onSubmit={handleAddFriend} className="relative flex items-center bg-[#1e1f22] rounded-lg border border-[#1e1f22] focus-within:border-brand p-1 transition-colors">
              <input 
                type="text" 
                value={addFriendQuery}
                onChange={e => setAddFriendQuery(e.target.value)}
                placeholder="Inserisci il nome utente"
                className="w-full bg-transparent text-[#dbdee1] p-2 pl-3 outline-none"
              />
              <button 
                type="submit" 
                disabled={!addFriendQuery.trim()}
                className="bg-[#5865f2] text-white text-sm font-medium px-4 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#4752c4] transition-colors"
              >
                Invia richiesta
              </button>
            </form>

            {searchResults.length > 0 && (
              <div className="mt-8">
                <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-4 border-b border-[#3f4147] pb-2">Risultati Ricerca</h3>
                <div className="space-y-2">
                  {searchResults.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-[#2b2d31] rounded-lg border border-[#1e1f22]">
                      <div className="flex items-center">
                        <img src={user.avatar} className="w-10 h-10 rounded-full bg-[#1e1f22]" />
                        <span className="ml-3 text-white font-medium">{user.name}</span>
                      </div>
                      <button 
                        onClick={() => sendFriendRequest(user.id)}
                        className="bg-[#23a559] hover:bg-[#1a7f44] text-white p-2 rounded-full transition-colors"
                        title="Aggiungi Amico"
                      >
                        <Check size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === 'pending' ? (
          <div>
            <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-4 border-b border-[#3f4147] pb-2">In attesa — {pendingRequests.length}</h3>
            {pendingRequests.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#949ba4]">
                <div className="w-[200px] h-[150px] bg-center bg-no-repeat mb-6 opacity-30" style={{backgroundImage: 'url(https://discord.com/assets/475ed85870a41d06ff3d.svg)'}}></div>
                <p>Nessuna richiesta di amicizia in attesa. Trovati un amico.</p>
              </div>
            ) : (
              <div className="space-y-[2px]">
                {pendingRequests.map(f => {
                  const isIncoming = f.receiver_id === currentUser.id;
                  return (
                    <div key={f.id} className="flex items-center justify-between p-3 hover:bg-[#35373c] rounded-lg group border-t border-[#3f4147]">
                      <div className="flex items-center">
                        <img src={f.otherUser.avatar} className="w-8 h-8 rounded-full bg-[#1e1f22]" />
                        <div className="ml-3 flex flex-col">
                          <span className="text-white font-medium">{f.otherUser.name}</span>
                          <span className="text-[#949ba4] text-xs">{isIncoming ? 'Richiesta ricevuta' : 'Richiesta inviata'}</span>
                        </div>
                      </div>
                      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {isIncoming && (
                          <button onClick={() => acceptRequest(f.id)} className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#b5bac1] hover:text-[#23a559] transition-colors" title="Accetta">
                            <Check size={20} />
                          </button>
                        )}
                        <button onClick={() => declineRequest(f.id)} className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#b5bac1] hover:text-[#f23f43] transition-colors" title={isIncoming ? "Rifiuta" : "Annulla"}>
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="relative mb-6">
              <input 
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cerca"
                className="w-full bg-[#1e1f22] text-[#dbdee1] p-2 pl-3 rounded outline-none"
              />
              <Search size={18} className="absolute right-3 top-2.5 text-[#949ba4]" />
            </div>

            <h3 className="text-[#b5bac1] text-xs font-bold uppercase mb-4 border-b border-[#3f4147] pb-2">
              {activeTab === 'online' ? 'Amici Disponibili' : 'Tutti gli Amici'} — {filteredFriends.length}
            </h3>

            {filteredFriends.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-[#949ba4]">
                <div className="w-[200px] h-[150px] bg-center bg-no-repeat mb-6 opacity-30" style={{backgroundImage: 'url(https://discord.com/assets/a2eec6fba9edbb491a10.svg)'}}></div>
                <p>{searchQuery ? "Nessun amico corrisponde alla ricerca." : (activeTab === 'online' ? "Nessuno è in giro per giocare." : "Non hai ancora nessun amico. Va' ad aggiungerne qualcuno!")}</p>
              </div>
            ) : (
              <div className="space-y-[2px]">
                {filteredFriends.map(f => (
                  <div key={f.id} className="flex items-center justify-between p-3 hover:bg-[#35373c] rounded-lg group border-t border-transparent hover:border-[#3f4147]">
                    <div className="flex items-center cursor-pointer flex-1" onClick={() => onStartDM(f.otherUser.id)}>
                      <div className="relative">
                        <img src={f.otherUser.avatar} className="w-8 h-8 rounded-full bg-[#1e1f22]" />
                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-[3px] border-[#313338] group-hover:border-[#35373c] ${f.otherUser.status === 'online' ? 'bg-[#23a559]' : 'bg-[#80848e]'}`} />
                      </div>
                      <div className="ml-3 flex flex-col">
                        <span className="text-white font-medium">{f.otherUser.name}</span>
                        <span className="text-[#949ba4] text-xs">{f.otherUser.status === 'online' ? 'Online' : 'Offline'}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onStartDM(f.otherUser.id)} className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#b5bac1] hover:text-white transition-colors" title="Messaggio">
                        <MessageSquare size={18} />
                      </button>
                      <button onClick={() => removeFriend(f.id)} className="w-9 h-9 rounded-full bg-[#2b2d31] flex items-center justify-center text-[#b5bac1] hover:text-[#f23f43] transition-colors" title="Rimuovi Amico">
                        <X size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};