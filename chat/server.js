const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const MAX_FILE = 8 * 1024 * 1024; // 8MB
const io = new Server(server, { maxHttpBufferSize: MAX_FILE * 1.5 });

app.use(express.static('public'));

// STUN は標準で設定。繋がらない環境用に TURN を環境変数で追加可能
app.get('/config', (req, res) => {
  const iceServers = [{ urls: 'stun:stun.l.google.com:19302' }];
  if (process.env.TURN_URL) {
    iceServers.push({
      urls: process.env.TURN_URL.split(','),
      username: process.env.TURN_USER,
      credential: process.env.TURN_PASS,
    });
  }
  res.json({ iceServers });
});

app.get('/healthz', (req, res) => res.send('ok'));

io.on('connection', (socket) => {
  socket.on('join', ({ room, name }) => {
    room = String(room || '').slice(0, 50) || 'main';
    name = String(name || '').slice(0, 30) || '名無し';
    socket.data.room = room;
    socket.data.name = name;
    socket.join(room);

    const others = [];
    for (const id of io.sockets.adapter.rooms.get(room) || []) {
      const s = io.sockets.sockets.get(id);
      if (id !== socket.id && s) others.push({ id, name: s.data.name });
    }
    socket.emit('joined', { id: socket.id, peers: others });
    socket.to(room).emit('peer-joined', { id: socket.id, name });
    socket.to(room).emit('system', `${name} が入室しました`);
  });

  socket.on('chat', (msg) => {
    const room = socket.data.room;
    if (!room) return;
    const out = { from: socket.data.name, id: socket.id, ts: Date.now() };
    if (msg && typeof msg.text === 'string') out.text = msg.text.slice(0, 4000);
    if (msg && msg.file && typeof msg.file.data === 'string' && msg.file.data.length <= MAX_FILE * 1.4) {
      out.file = {
        name: String(msg.file.name || 'file').slice(0, 200),
        type: String(msg.file.type || 'application/octet-stream').slice(0, 100),
        data: msg.file.data, // dataURL
      };
    }
    if (!out.text && !out.file) return;
    io.to(room).emit('chat', out);
  });

  // WebRTC シグナリング中継
  socket.on('signal', ({ to, data }) => {
    io.to(to).emit('signal', { from: socket.id, data });
  });
  socket.on('screen-meta', (meta) => {
    const room = socket.data.room;
    if (room) socket.to(room).emit('screen-meta', { from: socket.id, ...meta });
  });

  socket.on('disconnect', () => {
    const { room, name } = socket.data;
    if (!room) return;
    socket.to(room).emit('peer-left', { id: socket.id });
    socket.to(room).emit('system', `${name} が退室しました`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('listening on ' + PORT));