const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const getWorkers = async (
  page = 1,
  limit = 10,
  sort = 'id',
  order = 'DESC',
  search = ''
) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM workers';
  const params = [limit, offset];
  if (search) {
    query += ` WHERE name ILIKE $3 OR role ILIKE $3 OR contact ILIKE $3 OR sector ILIKE $3 OR CAST(hours AS TEXT) ILIKE $3`;
    params.push(`%${search}%`);
  }
  const validSortFields = ['id', 'name', 'role', 'contact', 'hours', 'sector'];
  const sortField = validSortFields.includes(sort) ? sort : 'id';
  const validOrders = ['ASC', 'DESC'];
  const orderDirection = validOrders.includes(order.toUpperCase())
    ? order.toUpperCase()
    : 'DESC';
  query += ` ORDER BY ${sortField} ${orderDirection} LIMIT $1 OFFSET $2`;
  const result = await pool.query(query, params);
  const totalQuery = `SELECT COUNT(*) FROM workers${
    search
      ? ` WHERE name ILIKE $1 OR role ILIKE $1 OR contact ILIKE $1 OR sector ILIKE $1 OR CAST(hours AS TEXT) ILIKE $1`
      : ''
  }`;
  const total = await pool.query(totalQuery, search ? [`%${search}%`] : []);
  return { data: result.rows, total: parseInt(total.rows[0].count) };
};

const createWorker = async (worker) => {
  const { name, role, contact, hours, sector } = worker;
  const result = await pool.query(
    'INSERT INTO workers (name, role, contact, hours, sector) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [name, role, contact, hours, sector]
  );
  return result.rows[0];
};

const updateWorker = async (id, worker) => {
  const { name, role, contact, hours, sector } = worker;
  const result = await pool.query(
    'UPDATE workers SET name = $1, role = $2, contact = $3, hours = $4, sector = $5 WHERE id = $6 RETURNING *',
    [name, role, contact, hours, sector, id]
  );
  return result.rows[0];
};

const deleteWorker = async (id) => {
  const result = await pool.query('SELECT * FROM workers WHERE id = $1', [id]);
  if (result.rows.length) {
    await pool.query(
      'INSERT INTO trash (item_type, item_data, deleted_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      ['workers', result.rows[0]]
    );
    await pool.query('DELETE FROM workers WHERE id = $1', [id]);
  }
};

const getWorkDone = async (
  page = 1,
  limit = 10,
  sort = 'date',
  order = 'DESC',
  search = ''
) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM work_done';
  const params = [limit, offset];
  if (search) {
    query += ` WHERE task ILIKE $3 OR sector ILIKE $3 OR equipment ILIKE $3 OR status ILIKE $3 OR CAST(cattle_count AS TEXT) ILIKE $3 OR CAST(cost AS TEXT) ILIKE $3 OR CAST(duration AS TEXT) ILIKE $3`;
    params.push(`%${search}%`);
  }
  const validSortFields = [
    'id',
    'task',
    'date',
    'worker_id',
    'sector',
    'cattle_count',
    'cost',
    'duration',
    'equipment',
    'status',
  ];
  const sortField = validSortFields.includes(sort) ? sort : 'date';
  const validOrders = ['ASC', 'DESC'];
  const orderDirection = validOrders.includes(order.toUpperCase())
    ? order.toUpperCase()
    : 'DESC';
  query += ` ORDER BY ${sortField} ${orderDirection} LIMIT $1 OFFSET $2`;
  const result = await pool.query(query, params);
  const totalQuery = `SELECT COUNT(*) FROM work_done${
    search
      ? ` WHERE task ILIKE $1 OR sector ILIKE $1 OR equipment ILIKE $1 OR status ILIKE $1 OR CAST(cattle_count AS TEXT) ILIKE $1 OR CAST(cost AS TEXT) ILIKE $1 OR CAST(duration AS TEXT) ILIKE $1`
      : ''
  }`;
  const total = await pool.query(totalQuery, search ? [`%${search}%`] : []);
  return { data: result.rows, total: parseInt(total.rows[0].count) };
};

const createWorkDone = async (work) => {
  const {
    task,
    date,
    worker_id,
    sector,
    cattle_count,
    cost,
    duration,
    equipment,
    status,
  } = work;
  const result = await pool.query(
    'INSERT INTO work_done (task, date, worker_id, sector, cattle_count, cost, duration, equipment, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
    [
      task,
      date,
      worker_id,
      sector,
      cattle_count,
      cost,
      duration,
      equipment,
      status,
    ]
  );
  return result.rows[0];
};

const updateWorkDone = async (id, work) => {
  const {
    task,
    date,
    worker_id,
    sector,
    cattle_count,
    cost,
    duration,
    equipment,
    status,
  } = work;
  const result = await pool.query(
    'UPDATE work_done SET task = $1, date = $2, worker_id = $3, sector = $4, cattle_count = $5, cost = $6, duration = $7, equipment = $8, status = $9 WHERE id = $10 RETURNING *',
    [
      task,
      date,
      worker_id,
      sector,
      cattle_count,
      cost,
      duration,
      equipment,
      status,
      id,
    ]
  );
  return result.rows[0];
};

const deleteWorkDone = async (id) => {
  const result = await pool.query('SELECT * FROM work_done WHERE id = $1', [
    id,
  ]);
  if (result.rows.length) {
    await pool.query(
      'INSERT INTO trash (item_type, item_data, deleted_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      ['work_done', result.rows[0]]
    );
    await pool.query('DELETE FROM work_done WHERE id = $1', [id]);
  }
};

const getWorkToDo = async (
  page = 1,
  limit = 10,
  sort = 'due_date',
  order = 'DESC',
  search = ''
) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM work_to_do';
  const params = [limit, offset];
  if (search) {
    query += ` WHERE task ILIKE $3 OR sector ILIKE $3 OR equipment ILIKE $3 OR priority ILIKE $3 OR status ILIKE $3 OR CAST(cattle_count AS TEXT) ILIKE $3 OR CAST(cost AS TEXT) ILIKE $3 OR CAST(duration AS TEXT) ILIKE $3`;
    params.push(`%${search}%`);
  }
  const validSortFields = [
    'id',
    'task',
    'due_date',
    'worker_id',
    'sector',
    'cattle_count',
    'cost',
    'duration',
    'equipment',
    'priority',
    'nb',
    'status',
  ];
  const sortField = validSortFields.includes(sort) ? sort : 'due_date';
  const validOrders = ['ASC', 'DESC'];
  const orderDirection = validOrders.includes(order.toUpperCase())
    ? order.toUpperCase()
    : 'DESC';
  query += ` ORDER BY ${sortField} ${orderDirection} LIMIT $1 OFFSET $2`;
  const result = await pool.query(query, params);
  const totalQuery = `SELECT COUNT(*) FROM work_to_do${
    search
      ? ` WHERE task ILIKE $1 OR sector ILIKE $1 OR equipment ILIKE $1 OR priority ILIKE $1 OR status ILIKE $1 OR CAST(cattle_count AS TEXT) ILIKE $1 OR CAST(cost AS TEXT) ILIKE $1 OR CAST(duration AS TEXT) ILIKE $1`
      : ''
  }`;
  const total = await pool.query(totalQuery, search ? [`%${search}%`] : []);
  return { data: result.rows, total: parseInt(total.rows[0].count) };
};

const createWorkToDo = async (work) => {
  const {
    task,
    due_date,
    worker_id,
    sector,
    cattle_count,
    cost,
    duration,
    equipment,
    priority,
    nb,
    status,
  } = work;
  const result = await pool.query(
    'INSERT INTO work_to_do (task, due_date, worker_id, sector, cattle_count, cost, duration, equipment, priority, nb, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
    [
      task,
      due_date,
      worker_id,
      sector,
      cattle_count,
      cost,
      duration,
      equipment,
      priority,
      nb,
      status,
    ]
  );
  return result.rows[0];
};

const updateWorkToDo = async (id, work) => {
  const {
    task,
    due_date,
    worker_id,
    sector,
    cattle_count,
    cost,
    duration,
    equipment,
    priority,
    nb,
    status,
  } = work;
  const result = await pool.query(
    'UPDATE work_to_do SET task = $1, due_date = $2, worker_id = $3, sector = $4, cattle_count = $5, cost = $6, duration = $7, equipment = $8, priority = $9, nb = $10, status = $11 WHERE id = $12 RETURNING *',
    [
      task,
      due_date,
      worker_id,
      sector,
      cattle_count,
      cost,
      duration,
      equipment,
      priority,
      nb,
      status,
      id,
    ]
  );
  return result.rows[0];
};

const deleteWorkToDo = async (id) => {
  const result = await pool.query('SELECT * FROM work_to_do WHERE id = $1', [
    id,
  ]);
  if (result.rows.length) {
    await pool.query(
      'INSERT INTO trash (item_type, item_data, deleted_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      ['work_to_do', result.rows[0]]
    );
    await pool.query('DELETE FROM work_to_do WHERE id = $1', [id]);
  }
};

const getNotifications = async (
  page = 1,
  limit = 10,
  sort = 'timestamp',
  order = 'DESC',
  search = ''
) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM notifications';
  const params = [limit, offset];
  if (search) {
    query += ` WHERE message ILIKE $3 OR CAST(worker_id AS TEXT) ILIKE $3`;
    params.push(`%${search}%`);
  }
  const validSortFields = ['id', 'message', 'worker_id', 'timestamp'];
  const sortField = validSortFields.includes(sort) ? sort : 'timestamp';
  const validOrders = ['ASC', 'DESC'];
  const orderDirection = validOrders.includes(order.toUpperCase())
    ? order.toUpperCase()
    : 'DESC';
  query += ` ORDER BY ${sortField} ${orderDirection} LIMIT $1 OFFSET $2`;
  const result = await pool.query(query, params);
  const totalQuery = `SELECT COUNT(*) FROM notifications${
    search ? ` WHERE message ILIKE $1 OR CAST(worker_id AS TEXT) ILIKE $1` : ''
  }`;
  const total = await pool.query(totalQuery, search ? [`%${search}%`] : []);
  return { data: result.rows, total: parseInt(total.rows[0].count) };
};

const createNotification = async (notification) => {
  const { message, worker_id } = notification;
  const result = await pool.query(
    'INSERT INTO notifications (message, worker_id) VALUES ($1, $2) RETURNING *',
    [message, worker_id]
  );
  return result.rows[0];
};

const deleteNotification = async (id) => {
  const result = await pool.query('SELECT * FROM notifications WHERE id = $1', [
    id,
  ]);
  if (result.rows.length) {
    await pool.query(
      'INSERT INTO trash (item_type, item_data, deleted_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      ['notifications', result.rows[0]]
    );
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
  }
};

module.exports = {
  getWorkers,
  createWorker,
  updateWorker,
  deleteWorker,
  getWorkDone,
  createWorkDone,
  updateWorkDone,
  deleteWorkDone,
  getWorkToDo,
  createWorkToDo,
  updateWorkToDo,
  deleteWorkToDo,
  getNotifications,
  createNotification,
  deleteNotification,
};
