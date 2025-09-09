// backend/server.js
const express = require('express');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const crmService = require('./services/crmService');
const iotService = require('./services/iotService');
const weatherRoutes = require('./api/weather');
const authService = require('./services/authService');
const { Pool } = require('pg');

dotenv.config();
const app = express();
app.use(express.json());

const cors = require('cors');
app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'https://chadelz-dev.github.io/cattle-frontend',
    ],
  })
);

const PORT = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: true },
});

// Login route (before verifyToken middleware to bypass token checks)
app.post('/api/auth/login', async (req, res) => {
  try {
    console.log(
      'Login: Processing request for /api/auth/login, no token required'
    ); // Debug
    const { name, password } = req.body;
    console.log('Login attempt:', { name });
    const { token } = await authService.login(name, password);
    console.log('Login successful, token:', token);
    res.json({ token });
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(401).json({ error: 'Login failed', details: error.message });
  }
});

// Webhook endpoint (before verifyToken middleware)
app.post('/api/webhook/iot', async (req, res) => {
  try {
    console.log(
      'Webhook: Received IoT data:',
      JSON.stringify(req.body, null, 2)
    );
    await iotService.processWebhookData(req.body);
    res.status(200).json({ message: 'Webhook data processed' });
  } catch (error) {
    console.error('Webhook: Error processing data:', error);
    res.status(500).json({ error: 'Webhook error', details: error.message });
  }
});

const verifyToken = (req, res, next) => {
  console.log(
    'verifyToken: Path:',
    req.path,
    'Method:',
    req.method,
    'AUTH_ENABLED:',
    process.env.AUTH_ENABLED
  ); // Debug
  const authHeader = req.headers['authorization'];
  console.log('verifyToken: Authorization header:', authHeader); // Debug
  const token = authHeader && authHeader.split(' ')[1];
  console.log('verifyToken: Extracted token:', token); // Debug

  // Always attempt to decode token if provided
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('verifyToken: Token decoded, user:', decoded);
      req.user = decoded;
    } catch (error) {
      console.log(
        'verifyToken: Invalid token, treating as guest',
        error.message
      );
      req.user = null;
    }
  } else {
    console.log('verifyToken: No token provided, treating as guest');
    req.user = null;
  }

  // Allow /api/auth/user and all GET requests without strict token check
  if (req.path === '/api/auth/user' || req.method === 'GET') {
    console.log('verifyToken: Allowing user or GET request');
    return next();
  }

  // For POST, PUT, DELETE routes when AUTH_ENABLED=true, require valid token
  if (process.env.AUTH_ENABLED === 'true' && !req.user) {
    console.log(
      'verifyToken: No valid token for protected route (POST/PUT/DELETE)'
    );
    return res.status(401).json({ error: 'No valid token provided' });
  }

  next();
};

app.use('/api', verifyToken);

app.get('/api/auth/user', async (req, res) => {
  try {
    console.log('Get user: Request headers:', req.headers); // Debug
    if (!req.user) {
      console.log('Get user: No valid token, returning guest');
      return res.json({ name: '', location: '' });
    }
    console.log('Get user: Fetching for user ID:', req.user.id);
    const result = await pool.query(
      'SELECT id, name, location FROM farmer_details WHERE id = $1',
      [req.user.id]
    );
    if (!result.rows.length) {
      console.log('Get user: Farmer not found for ID:', req.user.id);
      return res.json({ name: '', location: '' });
    }
    console.log('Get user: Returning data:', result.rows[0]);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Get user error:', error.message);
    res.status(500).json({ error: 'Get user error', details: error.message });
  }
});

// Keep all other routes unchanged
app.get('/api/crm/workers', async (req, res) => {
  try {
    const { page, limit, sort, order, search } = req.query;
    const result = await crmService.getWorkers(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      sort || 'id',
      order || 'DESC',
      search || ''
    );
    res.json(result);
  } catch (error) {
    console.error('CRM Workers error:', error);
    res
      .status(500)
      .json({ error: 'CRM Workers error', details: error.message });
  }
});

app.get('/api/crm/workers/:id', async (req, res) => {
  try {
    const worker = await crmService.getWorkerById(req.params.id);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (error) {
    console.error('CRM Worker fetch error:', error);
    res
      .status(500)
      .json({ error: 'CRM Worker fetch error', details: error.message });
  }
});

app.post('/api/crm/workers', async (req, res) => {
  try {
    console.log(
      'POST /api/crm/workers: Body:',
      JSON.stringify(req.body, null, 2)
    ); // Debug
    const worker = await crmService.createWorker(req.body);
    res.status(201).json(worker);
  } catch (error) {
    console.error('CRM Workers create error:', error);
    res
      .status(500)
      .json({ error: 'CRM Workers create error', details: error.message });
  }
});

app.put('/api/crm/workers/:id', async (req, res) => {
  try {
    console.log(
      'PUT /api/crm/workers/:id ID:',
      req.params.id,
      'Body:',
      JSON.stringify(req.body, null, 2)
    ); // Debug
    const worker = await crmService.updateWorker(req.params.id, req.body);
    if (!worker) return res.status(404).json({ error: 'Worker not found' });
    res.json(worker);
  } catch (error) {
    console.error('CRM Workers update error:', error);
    res
      .status(500)
      .json({ error: 'CRM Workers update error', details: error.message });
  }
});

app.delete('/api/crm/workers/:id', async (req, res) => {
  try {
    console.log('DELETE /api/crm/workers/:id ID:', req.params.id); // Debug
    await crmService.deleteWorker(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('CRM Workers delete error:', error);
    res
      .status(500)
      .json({ error: 'CRM Workers delete error', details: error.message });
  }
});

app.get('/api/crm/work_done', async (req, res) => {
  try {
    const { page, limit, sort, order, search } = req.query;
    const result = await crmService.getWorkDone(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      sort || 'date',
      order || 'DESC',
      search || ''
    );
    res.json(result);
  } catch (error) {
    console.error('CRM Work Done error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work Done error', details: error.message });
  }
});

app.post('/api/crm/work_done', async (req, res) => {
  try {
    console.log(
      'POST /api/crm/work_done: Body:',
      JSON.stringify(req.body, null, 2)
    ); // Debug
    const work = await crmService.createWorkDone(req.body);
    res.status(201).json(work);
  } catch (error) {
    console.error('CRM Work Done create error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work Done create error', details: error.message });
  }
});

app.put('/api/crm/work_done/:id', async (req, res) => {
  try {
    console.log(
      'PUT /api/crm/work_done/:id ID:',
      req.params.id,
      'Body:',
      JSON.stringify(req.body, null, 2)
    ); // Debug
    const work = await crmService.updateWorkDone(req.params.id, req.body);
    if (!work) return res.status(404).json({ error: 'Work Done not found' });
    res.json(work);
  } catch (error) {
    console.error('CRM Work Done update error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work Done update error', details: error.message });
  }
});

app.delete('/api/crm/work_done/:id', async (req, res) => {
  try {
    console.log('DELETE /api/crm/work_done/:id ID:', req.params.id); // Debug
    await crmService.deleteWorkDone(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('CRM Work Done delete error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work Done delete error', details: error.message });
  }
});

app.get('/api/crm/work_to_do', async (req, res) => {
  try {
    const { page, limit, sort, order, search } = req.query;
    console.log('GET /api/crm/work_to_do params:', {
      page,
      limit,
      sort,
      order,
      search,
    });
    const result = await crmService.getWorkToDo(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      sort || 'due_date',
      order || 'DESC',
      search || ''
    );
    res.json(result);
  } catch (error) {
    console.error('CRM Work To-Do error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work To-Do error', details: error.message });
  }
});

app.get('/api/crm/work_to_do/:id', async (req, res) => {
  try {
    console.log('GET /api/crm/work_to_do/:id ID:', req.params.id);
    const work = await crmService.getWorkToDoById(req.params.id);
    if (!work) return res.status(404).json({ error: 'Work To-Do not found' });
    res.json(work);
  } catch (error) {
    console.error('CRM Work To-Do fetch error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work To-Do fetch error', details: error.message });
  }
});

app.post('/api/crm/work_to_do', async (req, res) => {
  try {
    console.log(
      'POST /api/crm/work_to_do body:',
      JSON.stringify(req.body, null, 2)
    );
    const work = await crmService.createWorkToDo(req.body);
    res.status(201).json(work);
  } catch (error) {
    console.error('CRM Work To-Do create error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work To-Do create error', details: error.message });
  }
});

app.post('/api/crm/work_to_do/complete/:id', async (req, res) => {
  try {
    console.log(
      'POST /api/crm/work_to_do/complete/:id ID:',
      req.params.id,
      'body:',
      JSON.stringify(req.body, null, 2)
    );
    const work = await crmService.completeWorkToDo(req.params.id, req.body);
    res.status(201).json(work);
  } catch (error) {
    console.error('CRM Work To-Do complete error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work To-Do complete error', details: error.message });
  }
});

app.put('/api/crm/work_to_do/:id', async (req, res) => {
  try {
    console.log(
      'PUT /api/crm/work_to_do/:id ID:',
      req.params.id,
      'body:',
      JSON.stringify(req.body, null, 2)
    );
    if (Object.keys(req.body).length === 1 && 'nb' in req.body) {
      console.log('NB-only update for ID:', req.params.id);
      const work = await crmService.updateWorkToDo(req.params.id, {
        nb: req.body.nb,
      });
      if (!work) return res.status(404).json({ error: 'Work To-Do not found' });
      console.log('PUT response:', JSON.stringify(work, null, 2));
      return res.json(work);
    }
    const work = await crmService.updateWorkToDo(req.params.id, req.body);
    if (!work) return res.status(404).json({ error: 'Work To-Do not found' });
    console.log('PUT response:', JSON.stringify(work, null, 2));
    res.json(work);
  } catch (error) {
    console.error('CRM Work To-Do update error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work To-Do update error', details: error.message });
  }
});

app.delete('/api/crm/work_to_do/:id', async (req, res) => {
  try {
    console.log('DELETE /api/crm/work_to_do/:id ID:', req.params.id);
    await crmService.deleteWorkToDo(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error('CRM Work To-Do delete error:', error);
    res
      .status(500)
      .json({ error: 'CRM Work To-Do delete error', details: error.message });
  }
});

app.get('/api/crm/trash', async (req, res) => {
  try {
    const { page, limit, sort, order, search } = req.query;
    const result = await crmService.getTrash(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      sort || 'deleted_at',
      order || 'DESC',
      search || ''
    );
    res.json(result);
  } catch (error) {
    console.error('CRM Trash error:', error);
    res.status(500).json({ error: 'CRM Trash error', details: error.message });
  }
});

app.delete('/api/crm/trash', async (req, res) => {
  try {
    console.log('DELETE /api/crm/trash'); // Debug
    const result = await crmService.clearTrash();
    res.status(200).json(result);
  } catch (error) {
    console.error('CRM Trash clear error:', error);
    res
      .status(500)
      .json({ error: 'CRM Trash clear error', details: error.message });
  }
});

app.get('/api/iot/cattle', async (req, res) => {
  try {
    const { page, limit, sort, order, search } = req.query;
    const result = await iotService.getCattle(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      sort || 'timestamp',
      order || 'DESC',
      search || ''
    );
    res.json(result);
  } catch (error) {
    console.error('IoT Cattle error:', error);
    res.status(500).json({ error: 'IoT Cattle error', details: error.message });
  }
});

app.get('/api/iot/infrastructure', async (req, res) => {
  try {
    const { page, limit, sort, order, search } = req.query;
    const result = await iotService.getInfrastructure(
      parseInt(page) || 1,
      parseInt(limit) || 10,
      sort || 'timestamp',
      order || 'DESC',
      search || ''
    );
    res.json(result);
  } catch (error) {
    console.error('IoT Infrastructure error:', error);
    res
      .status(500)
      .json({ error: 'IoT Infrastructure error', details: error.message });
  }
});

app.get('/api/iot/map', async (req, res) => {
  try {
    const result = await iotService.getMapData();
    res.json(result);
  } catch (error) {
    console.error('IoT Map error:', error);
    res.status(500).json({ error: 'IoT Map error', details: error.message });
  }
});

app.post('/api/iot/simulate', async (req, res) => {
  try {
    console.log('POST /api/iot/simulate'); // Debug
    await iotService.simulateIotUpdate();
    res.status(201).send();
  } catch (error) {
    console.error('IoT Simulate error:', error);
    res
      .status(500)
      .json({ error: 'IoT Simulate error', details: error.message });
  }
});

weatherRoutes(app);

app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
