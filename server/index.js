const express = require('express');
const path = require('path');
const cors = require('cors');
const apiRoutes = require('./routes/api');
require('./services/storage');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use('/api', apiRoutes);

const publicDir = path.join(__dirname, '..', 'public');
app.use(express.static(publicDir));

app.get('/:hash/:id', (req, res, next) => {
  const { hash, id } = req.params;
  if (!/^[a-f0-9]{64}$/i.test(hash) || !/^\d+$/.test(id)) {
    return next();
  }
  res.sendFile(path.join(publicDir, 'message.html'));
});

app.get('*', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`ChatScan Block Explorer running on http://localhost:${PORT}`);
});
