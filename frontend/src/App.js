import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StickyNote, Users, Heart, Lock, Unlock, User, UserX, Send, Copy, Check, LogOut, Hash, Palette, Share2, X, AlertCircle, Home, Plus } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost';

// Cores principais da aplicação
const MAIN_COLORS = {
  background: '#FBFBFB', // Background principal
  gradients: ['#ADB2D4', '#C7D9DD', '#D5E5D5', '#EEF1DA'] // Cores para gradientes
};

// Paleta de cores para painéis de amigos (4 cores específicas)
const FRIENDS_COLORS = {
  notes: [
    '#A8D8EA', // Azul claro
    '#AA96DA', // Roxo claro
    '#FCBAD3', // Rosa claro
    '#FFFFD2'  // Amarelo claro
  ],
  borders: [
    '#9EC6F3', // Azul
    '#BDDDE4', // Azul acinzentado
    '#FFF1D5', // Bege claro
    '#FBFBFB'  // Branco off
  ],
  backgrounds: [
    '#9EC6F3', // Azul
    '#BDDDE4', // Azul acinzentado
    '#FFF1D5', // Bege claro
    '#FBFBFB'  // Branco off
  ]
};

// Paleta de cores românticas para painéis de casal (4 cores específicas)
const COUPLE_COLORS = {
  notes: [
    '#F9F5F6', // Rosa muito claro
    '#F8E8EE', // Rosa claro
    '#FDCEDF', // Rosa médio
    '#F2BED1'  // Rosa mais forte
  ],
  borders: [
    '#FF9292', // Vermelho claro
    '#FFB4B4', // Rosa salmão
    '#FFDCDC', // Rosa muito claro
    '#FFE8E8'  // Rosa quase branco
  ],
  backgrounds: [
    '#FF9292', // Vermelho claro
    '#FFB4B4', // Rosa salmão
    '#FFDCDC', // Rosa muito claro
    '#FFE8E8'  // Rosa quase branco
  ]
};

// Gradientes atualizados com as novas cores
const GRADIENTS = {
  main: `bg-gradient-to-br from-[#ADB2D4] via-[#C7D9DD] to-[#D5E5D5]`,
  friends: `bg-gradient-to-br from-[#9EC6F3] via-[#BDDDE4] to-[#FFF1D5]`,
  couple: `bg-gradient-to-br from-[#FF9292] via-[#FFB4B4] to-[#FFDCDC]`,
  panel_friends: `bg-gradient-to-br from-[#BDDDE4] to-[#FFF1D5]`,
  panel_couple: `bg-gradient-to-br from-[#FFB4B4] to-[#FFDCDC]`
};

// Função para obter cores baseadas no tipo do painel
const getColors = (type) => {
  return type === 'couple' ? COUPLE_COLORS : FRIENDS_COLORS;
};

// Função para gerar ID de usuário único
const getUserId = () => {
  let userId = localStorage.getItem('stickyNotesUserId');
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substring(2, 10);
    localStorage.setItem('stickyNotesUserId', userId);
  }
  return userId;
};

// Componente de Post-it
const PostIt = ({ post, onDelete, onMove, canDelete, isAnonymousAllowed, currentUserId }) => {
  const [position, setPosition] = useState({ x: post.position_x || 50, y: post.position_y || 50 });
  const [isDragging, setIsDragging] = useState(false);
  const noteRef = useRef(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    e.preventDefault();
    const rect = noteRef.current.getBoundingClientRect();
    dragStart.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !noteRef.current) return;
      
      const parent = noteRef.current.parentElement;
      const parentRect = parent.getBoundingClientRect();
      
      let newX = e.clientX - parentRect.left - dragStart.current.x;
      let newY = e.clientY - parentRect.top - dragStart.current.y;
      
      newX = Math.max(0, Math.min(newX, parentRect.width - 250));
      newY = Math.max(0, Math.min(newY, parentRect.height - 200));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        if (onMove) {
          onMove(post.id, position.x, position.y);
        }
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, position, post.id, onMove]);

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const postStyle = {
    backgroundColor: post.color || '#FFFFFF',
    left: position.x,
    top: position.y,
    background: `linear-gradient(135deg, ${post.color || '#FFFFFF'} 0%, ${post.color || '#FFFFFF'}dd 100%)`
  };

  // Verificar se pode deletar: próprio post ou post anônimo em painel de amigos
  const canDeletePost = post.author_id === currentUserId || (!post.author_name && isAnonymousAllowed);

  return (
    <div
      ref={noteRef}
      className={`absolute w-64 min-h-[180px] p-4 rounded-sm shadow-md transform transition-all duration-200 ${
        isDragging ? 'cursor-grabbing scale-105 rotate-1 shadow-xl z-50' : 'cursor-grab hover:shadow-lg hover:-rotate-1'
      }`}
      style={postStyle}
    >
      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-16 h-6 bg-yellow-200 opacity-60 rotate-3"></div>
      
      <div 
        className="flex justify-between items-start mb-3 -m-2 p-2 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
      >
        <div className="flex-1">
          <p className="text-xs font-medium text-gray-700">
            {post.author_name || (isAnonymousAllowed ? 'Anônimo' : 'Desconhecido')}
          </p>
          <p className="text-xs text-gray-500">
            {formatDate(post.created_at)}
          </p>
        </div>
        {canDeletePost && (
          <button
            onClick={() => onDelete(post.id)}
            className="p-1 hover:bg-black hover:bg-opacity-10 rounded transition-colors"
          >
            <span className="text-gray-600 text-lg">×</span>
          </button>
        )}
      </div>
      
      <div className="text-gray-800 text-sm whitespace-pre-wrap break-words">
        {post.content}
      </div>
    </div>
  );
};

// Componente Principal
export default function StickyNotesApp() {
  const [userId] = useState(getUserId());
  const [currentPanel, setCurrentPanel] = useState(null);
  const [posts, setPosts] = useState([]);
  const [panelType, setPanelType] = useState('');
  const [panelCode, setPanelCode] = useState('');
  const [panelName, setPanelName] = useState('');
  const [panelPassword, setPanelPassword] = useState('');
  const [requirePassword, setRequirePassword] = useState(false);
  const [userName, setUserName] = useState('');
  const [activeUsers, setActiveUsers] = useState([]);
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [newPost, setNewPost] = useState({ content: '', color: '#A8D8EA', anonymous: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [borderColor, setBorderColor] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [myPanels, setMyPanels] = useState([]);
  const [showMyPanels, setShowMyPanels] = useState(false);
  const [showPanelSwitch, setShowPanelSwitch] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [requiresPasswordCheck, setRequiresPasswordCheck] = useState(false);
  const [userNameSet, setUserNameSet] = useState(false);
  const [initialUserName, setInitialUserName] = useState('');
  const [userPanelCount, setUserPanelCount] = useState(0);
  
  // Estados para controlar fluxo e "Meus Murais" na tela principal
  const [initialChoice, setInitialChoice] = useState('');
  const [showMainMyPanels, setShowMainMyPanels] = useState(false);

const pollingInterval = useRef(null);

// Inicializar dados do usuário
useEffect(() => {
  const savedName = localStorage.getItem('stickyNotesUserName');
  if (savedName) {
    setUserName(savedName);
    setInitialUserName(savedName);
    setUserNameSet(true);
  } else {
    setUserNameSet(false);
  }
}, []);

  // Inicializar cores baseadas no tipo do painel
  useEffect(() => {
    if (panelType && panelType !== 'join' && panelType !== 'create') {
      const colors = getColors(panelType);
      setBorderColor(colors.borders[0]);
      setBackgroundColor(colors.backgrounds[0]);
      setNewPost(prev => ({ ...prev, color: colors.notes[0] }));
    }
  }, [panelType]);

  // Atualizar cores das notas quando entrar em um painel existente
  useEffect(() => {
    if (currentPanel) {
      const colors = getColors(currentPanel.type);
      setNewPost(prev => ({ ...prev, color: colors.notes[0] }));
      loadMyPanels();
      fetchUserPanelCount();
    }
  }, [currentPanel]);

  // Buscar contador de painéis do usuário para o tipo atual
  const fetchUserPanelCount = useCallback(async () => {
    if (!currentPanel) return;
    
    try {
      const response = await fetch(`${API_URL}/api/panels/${currentPanel.id}/user-panel-count?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setUserPanelCount(data.count);
      }
    } catch (err) {
      console.error('Erro ao buscar contador de painéis:', err);
    }
  }, [currentPanel, userId]);

  // Carregar painéis do usuário
  const loadMyPanels = useCallback(async () => {
    if (!userId) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/panels`);
      if (response.ok) {
        const panels = await response.json();
        setMyPanels(panels);
      }
    } catch (err) {
      console.error('Erro ao carregar painéis:', err);
      setMyPanels([]);
    }
  }, [userId]);

  const fetchPosts = useCallback(async () => {
    if (!currentPanel) return;
    
    try {
      const response = await fetch(`${API_URL}/api/panels/${currentPanel.id}/posts`);
      if (response.ok) {
        const postsData = await response.json();
        setPosts(postsData);
      }
    } catch (err) {
      console.error('Erro ao buscar posts:', err);
    }
  }, [currentPanel]);

  const fetchActiveUsers = useCallback(async () => {
    if (!currentPanel) return;
    
    try {
      const response = await fetch(`${API_URL}/api/panels/${currentPanel.id}/users`);
      if (response.ok) {
        const usersData = await response.json();
        setActiveUsers(usersData);
      }
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
      setActiveUsers([{ name: userName, user_id: userId }]);
    }
  }, [currentPanel, userName, userId]);

  useEffect(() => {
    if (currentPanel && userName) {
      fetchPosts();
      fetchActiveUsers();
      
      // Registrar usuário como ativo
      fetch(`${API_URL}/api/panels/${currentPanel.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: userName, userId })
      }).catch(console.error);
      
      pollingInterval.current = setInterval(() => {
        fetchPosts();
        fetchActiveUsers();
        fetchUserPanelCount();
      }, 3000);
      
      return () => {
        if (pollingInterval.current) {
          clearInterval(pollingInterval.current);
        }
        // Remover usuário quando sair
        fetch(`${API_URL}/api/panels/${currentPanel.id}/users/${userId}`, {
          method: 'DELETE'
        }).catch(console.error);
      };
    }
  }, [currentPanel, userName, userId, fetchPosts, fetchActiveUsers, fetchUserPanelCount]);

  // Verificar se painel requer senha
  useEffect(() => {
    const checkPassword = async () => {
      if (initialChoice === 'join' && panelCode.length === 6) {
        try {
          const response = await fetch(`${API_URL}/api/panels/${panelCode.toUpperCase()}/check`);
          if (response.ok) {
            const data = await response.json();
            setRequiresPasswordCheck(data.requiresPassword);
          }
        } catch (err) {
          console.error('Erro ao verificar senha:', err);
        }
      }
    };
    
    checkPassword();
  }, [panelCode, initialChoice]);

  // FUNÇÃO CORRIGIDA: Remover usuário da tabela panel_participants
  const removeUserFromPanel = async (panelId, userId) => {
  try {
    const response = await fetch(`${API_URL}/api/panels/${panelId}/participants/${userId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      console.error('Erro ao remover participante:', response.status);
    }
  } catch (err) {
    console.error('Erro ao remover participante:', err);
  }
};
  // FUNÇÃO CORRIGIDA: switchPanel
  const switchPanel = async (panel) => {
    try {
      // Se é o mesmo painel, apenas fechar o modal
      if (panel.id === currentPanel?.id) {
        setShowMyPanels(false);
        setShowMainMyPanels(false);
        return;
      }

      // Remover usuário do painel atual antes de trocar
      if (currentPanel && userId) {
        try {
          await fetch(`${API_URL}/api/panels/${currentPanel.id}/users/${userId}`, {
            method: 'DELETE'
          });
        } catch (err) {
          console.error('Erro ao remover usuário do painel atual:', err);
        }
      }

      // Acessar o novo painel
      const response = await fetch(`${API_URL}/api/panels/${panel.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userName: panel.user_name || userName,
          userId: userId
        })
      });
      
      if (response.ok) {
        const updatedPanel = await response.json();
        setCurrentPanel(updatedPanel);
        setUserName(panel.user_name || userName);
        setShowPanelSwitch(false);
        setShowMyPanels(false);
        setShowMainMyPanels(false);
        setInitialChoice('');
        
        // Limpar posts antigos e buscar novos
        setPosts([]);
        setActiveUsers([]);
      } else {
        console.error('Erro ao acessar painel:', response.status);
        setError('Erro ao acessar painel');
      }
    } catch (err) {
      console.error('Erro ao trocar painel:', err);
      setError('Erro ao trocar painel');
    }
  };

  // Tela inicial - Nova estrutura com "Meus Murais" no topo
if (!userNameSet) {
  return (
    <div className={`min-h-screen ${GRADIENTS.main}`} style={{ backgroundColor: MAIN_COLORS.background }}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-100">
          <div className="flex items-center justify-center mb-8">
            <StickyNote className="w-12 h-12 text-slate-600 mr-3" />
            <h1 className="text-4xl font-bold text-gray-800">
              Bem-vindo!
            </h1>
          </div>
          <p className="text-center text-gray-600 mb-8 text-lg">
            Como você gostaria de ser chamado?
          </p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div>
              <input
                type="text"
                placeholder="Digite seu nome..."
                value={initialUserName}
                onChange={(e) => setInitialUserName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all text-center text-lg"
                onKeyPress={(e) => e.key === 'Enter' && saveUserName()}
                autoFocus
              />
            </div>

            <button
              onClick={saveUserName}
              className="w-full py-3 rounded-xl font-semibold transition-all duration-200 transform hover:scale-[1.02] bg-gradient-to-r from-slate-600 to-gray-700 text-white hover:from-slate-700 hover:to-gray-800"
            >
              Continuar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Função para salvar o nome do usuário
const saveUserName = () => {
  if (!initialUserName.trim()) {
    setError('Digite seu nome');
    return;
  }
  setUserName(initialUserName);
  localStorage.setItem('stickyNotesUserName', initialUserName);
  setUserNameSet(true);
  setCurrentScreen('home');
  setError('');
};
// Tela do menu principal
if (currentScreen === 'home' && !currentPanel) { {
  return (
    <div className={`min-h-screen ${GRADIENTS.main}`} style={{ backgroundColor: MAIN_COLORS.background }}>
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full border border-gray-100">
          <div className="flex items-center justify-center mb-8">
            <StickyNote className="w-12 h-12 text-slate-600 mr-3" />
            <h1 className="text-5xl font-bold text-gray-800">
              Stickly Notes
            </h1>
          </div>
          <p className="text-center text-gray-600 mb-4 text-lg">
            Olá, <span className="font-semibold text-slate-700">{userName}</span>! 👋
          </p>
          <p className="text-center text-gray-600 mb-10 text-lg">
            Pense, anote, compartilhe!
          </p>

          <div className="space-y-4">
            <button
              onClick={() => {
              setCurrentScreen('myPanels');
              loadMyPanels();
            }}
              className="w-full p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl hover:from-purple-100 hover:to-indigo-100 transition-all duration-300 border border-purple-200 hover:border-purple-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <Users className="w-8 h-8 text-purple-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Meus murais</h3>
                  <p className="text-gray-600 text-sm mt-1">Acesse os murais que você já participa</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setCurrentScreen('create')}
              className="w-full p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-200 hover:border-blue-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <StickyNote className="w-8 h-8 text-blue-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Crie seu mural</h3>
                  <p className="text-gray-600 text-sm mt-1">Comece um novo mural para compartilhar com amigos ou seu par</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setCurrentScreen('join')}
              className="w-full p-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl hover:from-green-100 hover:to-emerald-100 transition-all duration-300 border border-green-200 hover:border-green-300 hover:shadow-lg transform hover:-translate-y-1"
            >
              <div className="flex items-center">
                <Hash className="w-8 h-8 text-green-600 mr-4" />
                <div className="text-left">
                  <h3 className="text-xl font-semibold text-gray-800">Acesse um mural</h3>
                  <p className="text-gray-600 text-sm mt-1">Entre em um mural existente usando um código</p>
                </div>
              </div>
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => {
                localStorage.removeItem('stickyNotesUserName');
                setUserNameSet(false);
                setInitialUserName('');
                setUserName('');
              }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Alterar nome
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
  // Tela "Meus Murais" da tela principal
  if (currentScreen === 'myPanels') {
    return (
      <div className={`min-h-screen ${GRADIENTS.main}`} style={{ backgroundColor: MAIN_COLORS.background }}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-100">
            <button
              onClick={() => {
                setCurrentScreen('home');
                setMyPanels([]);
              }}
              className="mb-6 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm"
            >
              ← Voltar
            </button>

            <div className="flex items-center justify-center mb-8">
              <Users className="w-10 h-10 text-purple-600 mr-3" />
              <h2 className="text-4xl font-bold text-gray-800">
                Meus Murais
              </h2>
            </div>

            {myPanels.length > 0 ? (
              <div className="space-y-3">
              <p className="text-sm text-gray-600 mb-4">
                Você participa de {myPanels.length} {myPanels.length === 1 ? 'mural' : 'murais'}
              </p>
                {myPanels.map(panel => (
                  <div
                    key={panel.id}
                    className="p-4 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {panel.type === 'couple' ? (
                          <Heart className="w-5 h-5 text-rose-500" />
                        ) : (
                          <Users className="w-5 h-5 text-slate-600" />
                        )}
                        <div>
                          <h4 className="font-semibold text-gray-800">{panel.name}</h4>
                          <p className="text-xs text-gray-600">
                            {panel.type === 'couple' ? 'Mural para casais' : 'Mural para amigos'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => switchPanel(panel)}
                        className="px-3 py-1 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
                      >
                        Entrar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">Você ainda não participa de nenhum mural.</p>
                <p className="text-gray-400 text-sm mt-2">Crie um novo mural ou entre com um código.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Tela de escolha do tipo de painel (após escolher "Crie seu mural")
  if (currentScreen === 'create' && !panelType) {
    return (
      <div className={`min-h-screen ${GRADIENTS.main}`} style={{ backgroundColor: MAIN_COLORS.background }}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-2xl w-full border border-gray-100">
            <button
              onClick={() => setCurrentScreen('home')}
              className="mb-6 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm"
            >
              ← Voltar
            </button>

            <div className="flex items-center justify-center mb-8">
              <StickyNote className="w-12 h-12 text-slate-600 mr-3" />
              <h1 className="text-4xl font-bold text-gray-800">
                Novo Mural
              </h1>
            </div>
            <p className="text-center text-gray-600 mb-10 text-lg">
              Quero compartilhar com:
            </p>

            <div className="space-y-4">
              <button
                onClick={() => setPanelType('friends')}
                className={`w-full p-6 ${GRADIENTS.friends} rounded-2xl hover:shadow-lg transition-all duration-300 border border-[#9EC6F3] hover:border-[#BDDDE4] transform hover:-translate-y-1`}
              >
                <div className="flex items-center">
                  <Users className="w-8 h-8 text-slate-600 mr-4" />
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-800">Meus amigos</h3>
                    <p className="text-gray-600 text-sm mt-1">Mural aconchegante para compartilhar com seus amigos</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setPanelType('couple')}
                className={`w-full p-6 ${GRADIENTS.couple} rounded-2xl hover:shadow-lg transition-all duration-300 border border-[#FF9292] hover:border-[#FFB4B4] transform hover:-translate-y-1`}
              >
                <div className="flex items-center">
                  <Heart className="w-8 h-8 text-rose-500 mr-4" />
                  <div className="text-left">
                    <h3 className="text-xl font-semibold text-gray-800">Meu par</h3>
                    <p className="text-gray-600 text-sm mt-1">Mural romântico para compartilhar com seu amor</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  // Area para digitar o nome
  const saveUserName = () => {
  if (!initialUserName.trim()) {
    setError('Digite seu nome');
    return;
  }
  setUserName(initialUserName);
  localStorage.setItem('stickyNotesUserName', initialUserName);
  setUserNameSet(true);
  setError('');
};

  // Continuar com as demais funções de API
  const createPanel = async () => {
    if (!panelName.trim()) {
      setError('Digite um nome para o painel');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/panels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: panelName,
          type: panelType,
          password: requirePassword ? panelPassword : null,
          creator: userName,
          userId: userId,
          borderColor,
          backgroundColor
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erro ao criar painel:', errorData);
        throw new Error('Erro ao criar painel');
      }

      const panel = await response.json();
      setCurrentPanel(panel);
      
    } catch (err) {
      console.error('Erro completo:', err);
      setError('Erro ao criar painel. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const accessPanel = async () => {
    if (!panelCode.trim()) {
      setError('Digite o código do painel');
      return;
    }

    if (!userName.trim()) {
      setError('Digite seu nome');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/panels/${panelCode.toUpperCase()}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: joinPassword || undefined,
          userName: userName,
          userId: userId
        })
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Painel não encontrado');
        }
        if (response.status === 401) {
          throw new Error('Senha incorreta');
        }
        if (response.status === 403) {
          throw new Error('Painel lotado');
        }
        const errorData = await response.text();
        console.error('Erro ao acessar painel:', errorData);
        throw new Error('Erro ao acessar painel');
      }

      const panel = await response.json();
      setCurrentPanel(panel);
      
      // Buscar posts existentes
      const postsResponse = await fetch(`${API_URL}/api/panels/${panelCode.toUpperCase()}/posts`);
      if (postsResponse.ok) {
        const postsData = await postsResponse.json();
        setPosts(postsData);
      }
      
    } catch (err) {
      console.error('Erro completo:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Tela de criação/acesso
  if (!currentPanel) {
    const colors = getColors(panelType === 'join' ? 'friends' : panelType);
    const gradient = panelType === 'couple' ? GRADIENTS.couple : 
                currentScreen === 'join' ? GRADIENTS.main : GRADIENTS.friends;

    return (
      <div className={`min-h-screen ${gradient}`} style={{ backgroundColor: MAIN_COLORS.background }}>
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full border border-gray-100">
            <button
              onClick={() => {
                if (currentScreen === 'join') {
                  setCurrentScreen('home');
                  setPanelCode('');
                  setJoinPassword('');
                  setRequiresPasswordCheck(false);
                } else {
                  setPanelType('');
                }
                setError('');
              }}
              className="mb-6 text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1 text-sm"
            >
              ← Voltar
            </button>

            <div className="flex items-center justify-center mb-8">
              {panelType === 'couple' ? (
                <Heart className="w-10 h-10 text-rose-500 mr-3" />
              ) : currentScreen === 'join' ? (
                <Hash className="w-10 h-10 text-green-600 mr-3" />
              ) : (
                <StickyNote className="w-10 h-10 text-slate-600 mr-3" />
              )}
              <h2 className="text-4xl font-bold text-gray-800">
                {panelType === 'couple' ? 'Painel Romântico' : 
                 currentScreen === 'join' ?  'Acessar Mural' : 
                 'Novo Mural'}
              </h2>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">

              {initialChoice === 'join' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Código do Mural
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: ABC123"
                      value={panelCode}
                      onChange={(e) => setPanelCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent uppercase font-mono text-lg tracking-wider transition-all"
                    />
                  </div>

                  {requiresPasswordCheck && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Senha do Mural
                      </label>
                      <input
                        type="password"
                        placeholder="Digite a senha do mural"
                        value={joinPassword}
                        onChange={(e) => setJoinPassword(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                      />
                    </div>
                  )}

                  <button
                    onClick={accessPanel}
                    disabled={loading}
                    className="w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
                  >
                    {loading ? 'Entrando...' : 'Entrar no Mural'}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Mural
                    </label>
                    <input
                      type="text"
                      placeholder={panelType === 'couple' ? 'Nosso cantinho romântico ❤️' : 'Ideias da turma'}
                      value={panelName}
                      onChange={(e) => setPanelName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Palette className="w-4 h-4 inline mr-1" />
                      Cor da Borda
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {colors.borders.map(color => (
                        <button
                          key={color}
                          onClick={() => setBorderColor(color)}
                          className={`w-12 h-12 rounded-xl border-4 transition-all ${
                            borderColor === color ? 'scale-110 shadow-lg' : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color, borderColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Palette className="w-4 h-4 inline mr-1" />
                      Cor de Fundo
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {colors.backgrounds.map(color => (
                        <button
                          key={color}
                          onClick={() => setBackgroundColor(color)}
                          className={`w-12 h-12 rounded-xl border-2 transition-all relative ${
                            backgroundColor === color ? 'border-gray-700 scale-110 shadow-lg' : 'border-gray-300 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color }}
                        >
                          {backgroundColor === color && (
                            <Check className="w-4 h-4 text-gray-700 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center">
                      {requirePassword ? <Lock className="w-5 h-5 text-slate-600 mr-2" /> : <Unlock className="w-5 h-5 text-gray-400 mr-2" />}
                      <span className="text-sm font-medium text-gray-700">Proteger com senha</span>
                    </div>
                    <button
                      onClick={() => setRequirePassword(!requirePassword)}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        requirePassword ? 'bg-slate-600' : 'bg-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                        requirePassword ? 'translate-x-6' : 'translate-x-0.5'
                      }`} />
                    </button>
                  </div>

                  {requirePassword && (
                    <input
                      type="password"
                      placeholder="Digite a senha do mural"
                      value={panelPassword}
                      onChange={(e) => setPanelPassword(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all"
                    />
                  )}

                  <button
                    onClick={createPanel}
                    disabled={loading}
                    className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 transform hover:scale-[1.02] ${
                      panelType === 'couple' 
                        ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700'
                        : 'bg-gradient-to-r from-slate-600 to-gray-700 text-white hover:from-slate-700 hover:to-gray-800'
                    }`}
                  >
                    {loading ? 'Criando...' : `Criar ${panelType === 'couple' ? 'Mural' : 'Mural'}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const createPost = async () => {
    if (!newPost.content.trim()) {
      setError('Digite uma mensagem');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const randomX = Math.floor(Math.random() * 600) + 50;
      const randomY = Math.floor(Math.random() * 300) + 50;

      const response = await fetch(`${API_URL}/api/panels/${currentPanel.id}/posts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          author_name: newPost.anonymous ? null : userName,
          author_id: userId,
          content: newPost.content,
          color: newPost.color,
          position_x: randomX,
          position_y: randomY
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Erro ao criar post:', errorData);
        throw new Error('Erro ao criar post');
      }

      const createdPost = await response.json();
      setPosts(prev => [createdPost, ...prev]);
      
      const colors = getColors(currentPanel.type);
      setNewPost({ content: '', color: colors.notes[0], anonymous: false });
      setShowNewPostForm(false);
      setError('');
    } catch (err) {
      console.error('Erro completo:', err);
      setError('Erro ao criar post. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId) => {
    try {
      const response = await fetch(`${API_URL}/api/posts/${postId}?panel_id=${currentPanel.id}&author_id=${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok || response.status === 404) {
        setPosts(prev => prev.filter(p => p.id !== postId));
      }
    } catch (err) {
      console.error('Erro ao deletar post:', err);
      setError('Erro ao deletar post');
    }
  };

  const movePost = async (postId, x, y) => {
    try {
      await fetch(`${API_URL}/api/posts/${postId}/position`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_x: x,
          position_y: y,
          panel_id: currentPanel.id
        })
      });

      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, position_x: x, position_y: y } : p
      ));
    } catch (err) {
      console.error('Erro ao mover post:', err);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(currentPanel.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // FUNÇÃO CORRIGIDA: exitPanel
  const exitPanel = async () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    // Remover usuário ao sair (tanto da tabela active_users quanto panel_participants)
    if (currentPanel && userId) {
      try {
        // Remover da lista de usuários ativos
        await fetch(`${API_URL}/api/panels/${currentPanel.id}/users/${userId}`, {
          method: 'DELETE'
        });
        
        // Remover da lista de participantes (novo endpoint)
        await removeUserFromPanel(currentPanel.id, userId);
      } catch (err) {
        console.error('Erro ao remover usuário:', err);
      }
    }
    
    setCurrentPanel(null);
    setPosts([]);
    setUserName('');
    setPanelType('');
    setPanelName('');
    setPanelCode('');
    setPanelPassword('');
    setJoinPassword('');
    setRequirePassword(false);
    setRequiresPasswordCheck(false);
    setActiveUsers([]);
    setBorderColor('');
    setBackgroundColor('');
    setShowExitConfirm(false);
    setShowMyPanels(false);
    setCurrentScreen('home');
    setError('');
    setUserPanelCount(0);
  };

  const goToHome = () => {
    exitPanel();
  };

  // Tela do painel
  const panelGradient = currentPanel.type === 'couple' ? GRADIENTS.panel_couple : GRADIENTS.panel_friends;
  const currentColors = getColors(currentPanel.type);

  return (
    <div className={`min-h-screen ${panelGradient}`}>
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={goToHome}
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <Home className="w-4 h-4" />
                Início
              </button>
              <button
                onClick={() => setShowMyPanels(true)}
                className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
              >
                <Users className="w-4 h-4" />
                Meus murais ({userPanelCount})
              </button>
              <div>
                <button
                  onClick={() => setShowPanelSwitch(true)}
                  className="text-xl font-bold text-gray-800 flex items-center gap-2 hover:text-gray-600 transition-colors"
                >
                  {currentPanel.type === 'couple' ? (
                    <Heart className="w-5 h-5 text-rose-500" />
                  ) : (
                    <StickyNote className="w-5 h-5 text-slate-600" />
                  )}
                  {currentPanel.name}
                  {currentPanel.type === 'couple' && (
                    <span className="text-rose-500">❤️</span>
                  )}
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
                currentPanel.type === 'couple' ? 'bg-rose-50' : 'bg-gray-50'
              }`}>
                <Users className={`w-4 h-4 ${
                  currentPanel.type === 'couple' ? 'text-rose-500' : 'text-slate-600'
                }`} />
                <span className="text-sm font-medium text-gray-700">
                  {activeUsers.length || 1}{currentPanel.type === 'couple' ? '/2' : '/15'}
                </span>
              </div>

              <button
                onClick={() => setShowShareModal(true)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-md text-sm ${
                  currentPanel.type === 'couple'
                    ? 'bg-gradient-to-r from-[#FF9292] to-[#FFB4B4] text-white hover:from-[#FFB4B4] hover:to-[#FFDCDC]'
                    : 'bg-gradient-to-r from-[#9EC6F3] to-[#BDDDE4] text-white hover:from-[#BDDDE4] hover:to-[#FFF1D5]'
                }`}
              >
                <Share2 className="w-4 h-4" />
                Compartilhar
              </button>

              <button
                onClick={() => setShowNewPostForm(true)}
                className={`px-4 py-2 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 shadow-md text-sm ${
                  currentPanel.type === 'couple'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700'
                    : 'bg-gradient-to-r from-slate-600 to-gray-700 text-white hover:from-slate-700 hover:to-gray-800'
                }`}
              >
                <Plus className="w-4 h-4" />
                Novo + {currentPanel.type === 'couple' ? '💕' : ''}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 h-[calc(100vh-80px)]">
        <div 
          className="relative w-full h-full rounded-lg shadow-inner overflow-hidden"
          style={{
            backgroundColor: currentPanel.background_color || backgroundColor || '#FBFBFB',
            border: `8px solid ${currentPanel.border_color || borderColor}`,
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 40px,
                #00000005 40px,
                #00000005 41px
              ),
              repeating-linear-gradient(
                90deg,
                transparent,
                transparent 40px,
                #00000005 40px,
                #00000005 41px
              )
            `
          }}
        >
          {posts.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                {currentPanel.type === 'couple' ? (
                  <Heart className="w-16 h-16 text-rose-300 mx-auto mb-4" />
                ) : (
                  <StickyNote className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                )}
                <p className="text-xl text-gray-400 mb-2">
                  {currentPanel.type === 'couple' ? 'Nenhuma mensagem de amor ainda 💕' : 'Nenhuma nota ainda'}
                </p>
                <p className="text-gray-500 text-sm">
                  {currentPanel.type === 'couple' 
                    ? 'Clique em "Novo +" para deixar uma mensagem romântica!'
                    : 'Clique em "Novo +" para adicionar a primeira!'
                  }
                </p>
              </div>
            </div>
          )}

          {posts.map((post) => (
            <PostIt
              key={post.id}
              post={post}
              onDelete={deletePost}
              onMove={movePost}
              canDelete={true}
              isAnonymousAllowed={currentPanel.type === 'friends'}
              currentUserId={userId}
            />
          ))}
        </div>
      </div>

      {/* Modal de Compartilhamento */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Share2 className={`w-6 h-6 ${
                  currentPanel.type === 'couple' ? 'text-rose-500' : 'text-blue-600'
                }`} />
                Compartilhar Mural
              </h2>
              <button
                onClick={() => setShowShareModal(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código do Mural
                </label>
                <div className="flex items-center gap-3">
                  <code className={`flex-1 px-4 py-3 rounded-xl text-lg font-mono font-bold text-center ${
                    currentPanel.type === 'couple' 
                      ? 'bg-rose-50 text-rose-800 border border-rose-200' 
                      : 'bg-gray-50 text-gray-800 border border-gray-200'
                  }`}>
                    {currentPanel.id}
                  </code>
                  <button
                    onClick={copyCode}
                    className={`p-3 rounded-xl transition-colors text-white ${
                      currentPanel.type === 'couple'
                        ? 'bg-rose-500 hover:bg-rose-600'
                        : 'bg-blue-500 hover:bg-blue-600'
                    }`}
                  >
                    {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className={`p-4 rounded-xl ${
                currentPanel.type === 'couple' ? 'bg-rose-50' : 'bg-blue-50'
              }`}>
                <p className={`text-sm ${
                  currentPanel.type === 'couple' ? 'text-rose-800' : 'text-blue-800'
                }`}>
                  Compartilhe este código com outras pessoas para que elas possam se juntar ao seu mural.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Meus Murais */}
      {showMyPanels && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                {currentPanel.type === 'couple' ? (
                  <Heart className="w-6 h-6 text-rose-500" />
                ) : (
                  <Users className="w-6 h-6 text-slate-600" />
                )}
                Meus {userPanelCount === 1 ? 'mural' : 'murais'} {currentPanel.type === 'couple' ? 'de Casal' : 'de Amigos'} ({userPanelCount})
              </h2>
              <button
                onClick={() => setShowMyPanels(false)}
                className="p-1 hover:bg-gray-100 rounded transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            <div className="space-y-3">
              {myPanels.filter(p => p.type === currentPanel.type).map(panel => (
                <div
                  key={panel.id}
                  className={`p-4 rounded-xl border-2 ${
                    panel.id === currentPanel.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
                  } transition-colors`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {panel.type === 'couple' ? (
                        <Heart className="w-5 h-5 text-rose-500" />
                      ) : (
                        <Users className="w-5 h-5 text-slate-600" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-800">{panel.name}</h3>
                        {panel.id === currentPanel.id && (
                          <span className="text-xs text-blue-600 font-medium">Mural atual</span>
                        )}
                      </div>
                    </div>
                    {panel.id !== currentPanel.id && (
                      <button
                        onClick={() => switchPanel(panel)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        Entrar
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {myPanels.filter(p => p.type === currentPanel.type).length === 0 && (
                <p className="text-center text-gray-500 py-4">
                  Você não participa de outros murais {currentPanel.type === 'couple' ? 'de casal' : 'de amigos'}.
                </p>
              )}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowExitConfirm(true)}
                  className="w-full px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sair do Mural
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Saída */}
      {showExitConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <div className="flex items-center justify-center mb-6">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            
            <h2 className="text-2xl font-bold text-gray-800 text-center mb-4">
              Confirmar Saída
            </h2>
            
            <p className="text-gray-600 text-center mb-6">
              Tem certeza que deseja sair do mural "{currentPanel.name}"?
              <br />
              <span className="text-sm text-red-600 mt-2 block">
                Você será removido permanentemente da lista de participantes.
              </span>
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={exitPanel}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors font-medium"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Nota */}
      {showNewPostForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              {currentPanel.type === 'couple' ? (
                <Heart className="w-6 h-6 text-rose-500" />
              ) : (
                <StickyNote className="w-6 h-6 text-slate-600" />
              )}
              {currentPanel.type === 'couple' ? 'Nova Mensagem de Amor 💕' : 'Nova Nota Adesiva'}
            </h2>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-5">
              {currentPanel.type === 'friends' && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center">
                    {newPost.anonymous ? <UserX className="w-5 h-5 text-gray-400 mr-2" /> : <User className="w-5 h-5 text-slate-600 mr-2" />}
                    <span className="text-sm font-medium text-gray-700">
                      {newPost.anonymous ? 'Enviar como anônimo' : `Enviar como ${userName}`}
                    </span>
                  </div>
                  <button
                    onClick={() => setNewPost({...newPost, anonymous: !newPost.anonymous})}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      newPost.anonymous ? 'bg-gray-400' : 'bg-slate-600'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform ${
                      newPost.anonymous ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {currentPanel.type === 'couple' ? 'Sua mensagem romântica ❤️' : 'Mensagem'}
                </label>
                <textarea
                  placeholder={currentPanel.type === 'couple' 
                    ? 'Escreva algo especial para quem você ama...' 
                    : 'Escreva sua nota...'
                  }
                  value={newPost.content}
                  onChange={(e) => setNewPost({...newPost, content: e.target.value})}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent resize-none transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Palette className="w-4 h-4 inline mr-1" />
                  {currentPanel.type === 'couple' ? 'Cor da Nota Romântica 💕' : 'Cor da Nota'}
                </label>
                <div className="mb-2">
                  <p className="text-xs text-gray-600">
                    {currentPanel.type === 'couple' 
                      ? 'Escolha uma cor apaixonante para sua mensagem de amor'
                      : 'Escolha uma cor aconchegante para sua nota'
                    }
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {currentColors.notes.map(color => (
                    <button
                      key={color}
                      onClick={() => setNewPost({...newPost, color})}
                      className={`w-12 h-12 rounded-xl border-2 transition-all relative group ${
                        newPost.color === color 
                          ? currentPanel.type === 'couple'
                            ? 'border-rose-500 scale-110 shadow-lg ring-2 ring-rose-200'
                            : 'border-gray-700 scale-110 shadow-lg ring-2 ring-gray-200'
                          : 'border-gray-300 hover:scale-105 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={`Cor: ${color}`}
                    >
                      {newPost.color === color && (
                        <Check className={`w-4 h-4 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
                          ['#F9F5F6', '#F8E8EE', '#A8D8EA', '#FFFFD2'].includes(color)
                            ? 'text-gray-700' 
                            : 'text-white drop-shadow-sm'
                        }`} />
                      )}
                      {currentPanel.type === 'couple' && newPost.color === color && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">💕</span>
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-lg border-2 border-dashed border-gray-300">
                  <div 
                    className="w-full h-16 rounded-lg flex items-center justify-center text-sm text-gray-600 shadow-sm"
                    style={{ backgroundColor: newPost.color }}
                  >
                    {currentPanel.type === 'couple' 
                      ? 'Prévia da sua nota romântica 💕'
                      : 'Prévia da sua nota'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => {
                  setShowNewPostForm(false);
                  setError('');
                  const colors = getColors(currentPanel.type);
                  setNewPost({ content: '', color: colors.notes[0], anonymous: false });
                }}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={createPost}
                disabled={loading}
                className={`flex-1 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2 transform hover:scale-[1.02] ${
                  currentPanel.type === 'couple'
                    ? 'bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700'
                    : 'bg-gradient-to-r from-slate-600 to-gray-700 text-white hover:from-slate-700 hover:to-gray-800'
                }`}
              >
                {loading ? 'Colando...' : (
                  <>
                    <Send className="w-4 h-4" />
                    {currentPanel.type === 'couple' ? 'Enviar com Amor 💕' : 'Colar Nota'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 
}