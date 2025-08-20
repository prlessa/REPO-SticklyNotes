// server.js - Backend do Sticky Notes
const express = require('express');
const cors = require('cors');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Configurações
const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/stickynotes_db';

// Conexões
const redis = new Redis(REDIS_URL);
const redisSub = new Redis(REDIS_URL);
const pg = new Pool({ connectionString: DATABASE_URL });

// Middleware
app.use(cors());
app.use(express.json());

// Inicializar banco de dados
async function initDB() {
  try {
    // Tabela de painéis
    await pg.query(`
      CREATE TABLE IF NOT EXISTS panels (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type VARCHAR(20) NOT NULL CHECK (type IN ('friends', 'couple')),
        password_hash VARCHAR(255),
        creator VARCHAR(100) NOT NULL,
        border_color VARCHAR(7) DEFAULT '#9EC6F3',
        background_color VARCHAR(7) DEFAULT '#FBFBFB',
        max_users INTEGER DEFAULT 15,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabela de posts
    await pg.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        panel_id VARCHAR(10) REFERENCES panels(id) ON DELETE CASCADE,
        author_name VARCHAR(100),
        author_id VARCHAR(50),
        content TEXT NOT NULL,
        color VARCHAR(7) DEFAULT '#A8D8EA',
        position_x INTEGER DEFAULT 50,
        position_y INTEGER DEFAULT 50,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Tabela de usuários ativos
    await pg.query(`
      CREATE TABLE IF NOT EXISTS active_users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        panel_id VARCHAR(10) REFERENCES panels(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL,
        name VARCHAR(100) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(panel_id, user_id)
      )
    `);

    // Tabela de participação em painéis
    await pg.query(`
      CREATE TABLE IF NOT EXISTS panel_participants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        panel_id VARCHAR(10) REFERENCES panels(id) ON DELETE CASCADE,
        user_id VARCHAR(50) NOT NULL,
        user_name VARCHAR(100) NOT NULL,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_access TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(panel_id, user_id)
      )
    `);
    
    // Índices para melhor performance
    await pg.query(`
      CREATE INDEX IF NOT EXISTS idx_posts_panel_id ON posts(panel_id);
      CREATE INDEX IF NOT EXISTS idx_posts_author_id ON posts(author_id);
      CREATE INDEX IF NOT EXISTS idx_active_users_panel_id ON active_users(panel_id);
      CREATE INDEX IF NOT EXISTS idx_active_users_last_seen ON active_users(last_seen);
      CREATE INDEX IF NOT EXISTS idx_panel_participants_user_id ON panel_participants(user_id);
      CREATE INDEX IF NOT EXISTS idx_panel_participants_panel_id ON panel_participants(panel_id);
    `);
    
    console.log('📊 Database initialized with Sticky Notes schema');
  } catch (error) {
    console.error('Database initialization error:', error);
  }
}

// Limpar usuários inativos (mais de 5 minutos sem atividade)
async function cleanupInactiveUsers() {
  try {
    await pg.query(`
      DELETE FROM active_users 
      WHERE last_seen < NOW() - INTERVAL '5 minutes'
    `);
  } catch (error) {
    console.error('Error cleaning up inactive users:', error);
  }
}

// Executar limpeza a cada minuto
setInterval(cleanupInactiveUsers, 60000);

// Funções auxiliares
function generatePanelCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateUserId() {
  return 'user_' + uuidv4().substring(0, 8);
}

// Cache functions
async function getCachedPanel(panelId) {
  const cached = await redis.get(`panel:${panelId}`);
  if (cached) return JSON.parse(cached);
  
  const result = await pg.query(
    'SELECT * FROM panels WHERE id = $1',
    [panelId]
  );
  
  if (result.rows.length > 0) {
    const panel = result.rows[0];
    // Não cachear a senha
    delete panel.password_hash;
    await redis.setex(`panel:${panelId}`, 3600, JSON.stringify(panel));
    return panel;
  }
  return null;
}

async function getCachedPosts(panelId) {
  const cached = await redis.get(`posts:${panelId}`);
  if (cached) return JSON.parse(cached);
  
  const result = await pg.query(
    'SELECT * FROM posts WHERE panel_id = $1 ORDER BY created_at DESC',
    [panelId]
  );
  
  await redis.setex(`posts:${panelId}`, 300, JSON.stringify(result.rows));
  return result.rows;
}
// Rotas da API

// Verificar se painel requer senha
app.get('/api/panels/:code/check', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await pg.query(
      'SELECT password_hash IS NOT NULL as requires_password FROM panels WHERE id = $1',
      [code.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Painel não encontrado' });
    }
    
    res.json({ requiresPassword: result.rows[0].requires_password });
  } catch (error) {
    console.error('Error checking panel:', error);
    res.status(500).json({ error: 'Erro ao verificar painel' });
  }
});

// Criar novo painel
app.post('/api/panels', async (req, res) => {
  try {
    const { name, type, password, creator, userId, borderColor, backgroundColor } = req.body;
    
    if (!name || !type || !creator || !userId) {
      return res.status(400).json({ error: 'Nome, tipo, criador e ID de usuário são obrigatórios' });
    }
    
    if (!['friends', 'couple'].includes(type)) {
      return res.status(400).json({ error: 'Tipo inválido' });
    }
    
    let code;
    let exists = true;
    
    // Garantir código único
    while (exists) {
      code = generatePanelCode();
      const check = await pg.query('SELECT id FROM panels WHERE id = $1', [code]);
      exists = check.rows.length > 0;
    }
    
    // Hash da senha se fornecida
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    
    // Definir máximo de usuários baseado no tipo
    const maxUsers = type === 'couple' ? 2 : 15;
    
    // Validar cores baseadas no tipo
    let validBorderColor = borderColor;
    let validBackgroundColor = backgroundColor;
    
    if (type === 'friends') {
      const validBorders = ['#9EC6F3', '#BDDDE4', '#FFF1D5', '#FBFBFB'];
      if (!validBorders.includes(borderColor)) {
        validBorderColor = '#9EC6F3';
      }
      const validBackgrounds = ['#9EC6F3', '#BDDDE4', '#FFF1D5', '#FBFBFB'];
      if (!validBackgrounds.includes(backgroundColor)) {
        validBackgroundColor = '#FBFBFB';
      }
    } else if (type === 'couple') {
      const validBorders = ['#FF9292', '#FFB4B4', '#FFDCDC', '#FFE8E8'];
      if (!validBorders.includes(borderColor)) {
        validBorderColor = '#FF9292';
      }
      const validBackgrounds = ['#FF9292', '#FFB4B4', '#FFDCDC', '#FFE8E8'];
      if (!validBackgrounds.includes(backgroundColor)) {
        validBackgroundColor = '#FFE8E8';
      }
    }
    
    const result = await pg.query(
      `INSERT INTO panels (id, name, type, password_hash, creator, border_color, background_color, max_users) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [code, name, type, passwordHash, creator, validBorderColor, validBackgroundColor, maxUsers]
    );
    
    const panel = result.rows[0];
    delete panel.password_hash; // Não retornar a senha
    
    // Adicionar criador como participante
    await pg.query(
      `INSERT INTO panel_participants (panel_id, user_id, user_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (panel_id, user_id) DO UPDATE 
       SET last_access = CURRENT_TIMESTAMP`,
      [code, userId, creator]
    );
    
    await redis.setex(`panel:${code}`, 3600, JSON.stringify(panel));
    
    res.status(201).json(panel);
  } catch (error) {
    console.error('Error creating panel:', error);
    res.status(500).json({ error: 'Erro ao criar painel' });
  }
});

// Acessar painel existente
app.post('/api/panels/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { password, userName, userId } = req.body;
    
    if (!userName || !userId) {
      return res.status(400).json({ error: 'Nome e ID de usuário são obrigatórios' });
    }
    
    const result = await pg.query(
      'SELECT * FROM panels WHERE id = $1',
      [code.toUpperCase()]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Painel não encontrado' });
    }
    
    const panel = result.rows[0];
    
    // Verificar senha se necessário
    if (panel.password_hash) {
      if (!password) {
        return res.status(401).json({ error: 'Senha necessária' });
      }
      
      const passwordMatch = await bcrypt.compare(password, panel.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Senha incorreta' });
      }
    }
    
    // Verificar limite de usuários
    const activeUsersResult = await pg.query(
      'SELECT COUNT(DISTINCT user_id) FROM active_users WHERE panel_id = $1',
      [code.toUpperCase()]
    );
    
    const activeCount = parseInt(activeUsersResult.rows[0].count);
    if (activeCount >= panel.max_users) {
      // Verificar se o usuário já está na sala
      const userExists = await pg.query(
        'SELECT id FROM active_users WHERE panel_id = $1 AND user_id = $2',
        [code.toUpperCase(), userId]
      );
      
      if (userExists.rows.length === 0) {
        return res.status(403).json({ error: `Painel lotado (máximo ${panel.max_users} usuários)` });
      }
    }
    
    // Adicionar como participante
    await pg.query(
      `INSERT INTO panel_participants (panel_id, user_id, user_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (panel_id, user_id) DO UPDATE 
       SET last_access = CURRENT_TIMESTAMP, user_name = $3`,
      [code.toUpperCase(), userId, userName]
    );
    
    // Atualizar última atividade
    pg.query(
      'UPDATE panels SET last_activity = CURRENT_TIMESTAMP WHERE id = $1',
      [code.toUpperCase()]
    ).catch(console.error);
    
    delete panel.password_hash; // Não retornar a senha
    res.json(panel);
  } catch (error) {
    console.error('Error accessing panel:', error);
    res.status(500).json({ error: 'Erro ao acessar painel' });
  }
});

// Buscar painéis do usuário
app.get('/api/users/:userId/panels', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const result = await pg.query(
      `SELECT DISTINCT p.id, p.name, p.type, p.border_color, p.background_color, p.created_at,
              pp.last_access, pp.user_name
       FROM panels p
       INNER JOIN panel_participants pp ON p.id = pp.panel_id
       WHERE pp.user_id = $1
       ORDER BY pp.last_access DESC`,
      [userId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching user panels:', error);
    res.status(500).json({ error: 'Erro ao buscar painéis do usuário' });
  }
});

// Buscar posts do painel
app.get('/api/panels/:code/posts', async (req, res) => {
  try {
    const { code } = req.params;
    const posts = await getCachedPosts(code.toUpperCase());
    res.json(posts);
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Erro ao buscar posts' });
  }
});

// Criar novo post
app.post('/api/panels/:code/posts', async (req, res) => {
  try {
    const { code } = req.params;
    const { author_name, author_id, content, color, position_x, position_y } = req.body;
    
    if (!content || !author_id) {
      return res.status(400).json({ error: 'Conteúdo e ID do autor são obrigatórios' });
    }
    
    const panelCode = code.toUpperCase();
    const panel = await getCachedPanel(panelCode);
    
    if (!panel) {
      return res.status(404).json({ error: 'Painel não encontrado' });
    }
    
    // Verificar se mensagens anônimas são permitidas
    if (!author_name && panel.type === 'couple') {
      return res.status(400).json({ error: 'Mensagens anônimas não são permitidas em painéis de casal' });
    }
    
    // Validar cor baseada no tipo do painel
    let validColor = color;
    if (panel.type === 'friends') {
      const validColors = ['#A8D8EA', '#AA96DA', '#FCBAD3', '#FFFFD2'];
      if (!validColors.includes(color)) {
        validColor = '#A8D8EA';
      }
    } else if (panel.type === 'couple') {
      const validColors = ['#F9F5F6', '#F8E8EE', '#FDCEDF', '#F2BED1'];
      if (!validColors.includes(color)) {
        validColor = '#F9F5F6';
      }
    }
    
    const result = await pg.query(
      `INSERT INTO posts (panel_id, author_name, author_id, content, color, position_x, position_y) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [panelCode, author_name || null, author_id, content, validColor, position_x || 50, position_y || 50]
    );
    
    const post = result.rows[0];
    
    // Invalidar cache
    await redis.del(`posts:${panelCode}`);
    
    // Publicar para subscribers via Redis
    await redis.publish(`panel:${panelCode}`, JSON.stringify({
      type: 'NEW_POST',
      post
    }));
    
    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Erro ao criar post' });
  }
});
// Atualizar posição do post
app.patch('/api/posts/:postId/position', async (req, res) => {
  try {
    const { postId } = req.params;
    const { position_x, position_y, panel_id } = req.body;
    
    const result = await pg.query(
      'UPDATE posts SET position_x = $1, position_y = $2 WHERE id = $3 RETURNING *',
      [position_x, position_y, postId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    const post = result.rows[0];
    
    // Invalidar cache
    await redis.del(`posts:${panel_id}`);
    
    // Notificar via WebSocket
    await redis.publish(`panel:${panel_id}`, JSON.stringify({
      type: 'POST_MOVED',
      post
    }));
    
    res.json(post);
  } catch (error) {
    console.error('Error updating post position:', error);
    res.status(500).json({ error: 'Erro ao atualizar posição' });
  }
});

// Deletar post
app.delete('/api/posts/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    const { panel_id, author_id } = req.query;
    
    // Verificar se o usuário pode deletar o post
    const checkResult = await pg.query(
      'SELECT author_id FROM posts WHERE id = $1',
      [postId]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Post não encontrado' });
    }
    
    const post = checkResult.rows[0];
    
    // Permitir deletar apenas posts próprios ou anônimos (em painéis de amigos)
    if (post.author_id !== author_id && post.author_id !== null) {
      return res.status(403).json({ error: 'Sem permissão para deletar este post' });
    }
    
    const result = await pg.query(
      'DELETE FROM posts WHERE id = $1 RETURNING *',
      [postId]
    );
    
    // Invalidar cache
    await redis.del(`posts:${panel_id}`);
    
    // Notificar via WebSocket
    await redis.publish(`panel:${panel_id}`, JSON.stringify({
      type: 'POST_DELETED',
      postId
    }));
    
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Erro ao deletar post' });
  }
});
// Remover participante do painel (desvinculação permanente)
app.delete('/api/panels/:code/participants/:userId', async (req, res) => {
  try {
    const { code, userId } = req.params;
    
    // Remover da tabela de participantes
    await pg.query(
      'DELETE FROM panel_participants WHERE panel_id = $1 AND user_id = $2',
      [code.toUpperCase(), userId]
    );
    
    // Também remover da tabela de usuários ativos
    await pg.query(
      'DELETE FROM active_users WHERE panel_id = $1 AND user_id = $2',
      [code.toUpperCase(), userId]
    );
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing participant:', error);
    res.status(500).json({ error: 'Erro ao remover participante' });
  }
});

// Gerenciar usuários ativos
app.post('/api/panels/:code/users', async (req, res) => {
  try {
    const { code } = req.params;
    const { name, userId } = req.body;
    
    if (!name || !userId) {
      return res.status(400).json({ error: 'Nome e ID são obrigatórios' });
    }
    
    // Inserir ou atualizar usuário ativo
    await pg.query(
      `INSERT INTO active_users (panel_id, user_id, name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (panel_id, user_id) 
       DO UPDATE SET last_seen = CURRENT_TIMESTAMP, name = $3`,
      [code.toUpperCase(), userId, name]
    );
    
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Erro ao adicionar usuário' });
  }
});

app.get('/api/panels/:code/users', async (req, res) => {
  try {
    const { code } = req.params;
    
    const result = await pg.query(
      `SELECT DISTINCT user_id, name, joined_at FROM active_users 
       WHERE panel_id = $1 
       AND last_seen > NOW() - INTERVAL '5 minutes'
       ORDER BY joined_at`,
      [code.toUpperCase()]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

app.delete('/api/panels/:code/users/:userId', async (req, res) => {
  try {
    const { code, userId } = req.params;
    
    await pg.query(
      'DELETE FROM active_users WHERE panel_id = $1 AND user_id = $2',
      [code.toUpperCase(), userId]
    );
    
    res.status(204).send();
  } catch (error) {
    console.error('Error removing user:', error);
    res.status(500).json({ error: 'Erro ao remover usuário' });
  }
});

// Contar painéis ativos do usuário por tipo
app.get('/api/panels/:code/user-panel-count', async (req, res) => {
  try {
    const { code } = req.params;
    const { userId } = req.query;
    
    if (!userId) {
      return res.status(400).json({ error: 'ID do usuário é obrigatório' });
    }
    
    // Buscar tipo do painel atual
    const panelResult = await pg.query(
      'SELECT type FROM panels WHERE id = $1',
      [code.toUpperCase()]
    );
    
    if (panelResult.rows.length === 0) {
      return res.status(404).json({ error: 'Painel não encontrado' });
    }
    
    const panelType = panelResult.rows[0].type;
    
    // Contar painéis do mesmo tipo que o usuário participa
    const countResult = await pg.query(
      `SELECT COUNT(DISTINCT p.id) as count
       FROM panels p
       INNER JOIN active_users au ON p.id = au.panel_id
       WHERE au.user_id = $1 AND p.type = $2
       AND au.last_seen > NOW() - INTERVAL '5 minutes'`,
      [userId, panelType]
    );
    
    res.json({ 
      count: parseInt(countResult.rows[0].count),
      type: panelType 
    });
  } catch (error) {
    console.error('Error counting user panels:', error);
    res.status(500).json({ error: 'Erro ao contar painéis' });
  }
});

// WebSocket handling
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);
  let currentUserId = null;
  let currentPanelId = null;
  
  socket.on('join-panel', async (panelId, userName, userId) => {
    socket.join(`panel:${panelId}`);
    currentUserId = userId;
    currentPanelId = panelId;
    
    console.log(`User ${userName} (${userId}) joined panel ${panelId}`);
    
    // Atualizar último visto
    if (userName && userId) {
      pg.query(
        `INSERT INTO active_users (panel_id, user_id, name) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (panel_id, user_id) 
         DO UPDATE SET last_seen = CURRENT_TIMESTAMP, name = $3`,
        [panelId, userId, userName]
      ).catch(console.error);
    }
    
    // Enviar posts existentes
    const posts = await getCachedPosts(panelId);
    socket.emit('initial-posts', posts);
    
    // Notificar outros usuários
    socket.to(`panel:${panelId}`).emit('user-joined', { userName, userId });
  });
  
  socket.on('leave-panel', (panelId, userName, userId) => {
    socket.leave(`panel:${panelId}`);
    console.log(`User ${userName} (${userId}) left panel ${panelId}`);
    
    // Remover da lista de ativos
    if (userId) {
      pg.query(
        'DELETE FROM active_users WHERE panel_id = $1 AND user_id = $2',
        [panelId, userId]
      ).catch(console.error);
    }
    
    // Notificar outros usuários
    socket.to(`panel:${panelId}`).emit('user-left', { userName, userId });
  });
  
  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
    
    // Remover usuário ativo se desconectar
    if (currentUserId && currentPanelId) {
      pg.query(
        'DELETE FROM active_users WHERE panel_id = $1 AND user_id = $2',
        [currentPanelId, currentUserId]
      ).catch(console.error);
    }
  });
});

// Redis Pub/Sub para sincronização entre instâncias
redisSub.on('message', (channel, message) => {
  if (channel.startsWith('panel:')) {
    const data = JSON.parse(message);
    io.to(channel).emit('panel-update', data);
  }
});

// Subscribe to all panel channels
redisSub.psubscribe('panel:*');

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'Sticky Notes Backend',
    timestamp: new Date().toISOString() 
  });
});

// Inicializar servidor
async function start() {
  await initDB();
  
  httpServer.listen(PORT, () => {
    console.log(`🚀 Sticky Notes Server running on port ${PORT}`);
    console.log(`📡 WebSocket server ready`);
    console.log(`💾 Redis connected`);
    console.log(`🗄️  PostgreSQL connected`);
  });
}

start().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    redis.disconnect();
    redisSub.disconnect();
    pg.end();
    process.exit(0);
  });
});