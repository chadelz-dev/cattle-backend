const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
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
  const orderDirection = ['ASC', 'DESC'].includes(order.toUpperCase())
    ? order.toUpperCase()
    : 'DESC';
  query += ` ORDER BY ${sortField} ${orderDirection} LIMIT $1 OFFSET $2`;
  console.log('getWorkers query:', query, 'params:', params);
  try {
    const result = await pool.query(query, params);
    const totalQuery = `SELECT COUNT(*) FROM workers${
      search
        ? ` WHERE name ILIKE $1 OR role ILIKE $1 OR contact ILIKE $1 OR sector ILIKE $1 OR CAST(hours AS TEXT) ILIKE $1`
        : ''
    }`;
    const total = await pool.query(totalQuery, search ? [`%${search}%`] : []);
    return { data: result.rows, total: parseInt(total.rows[0].count) };
  } catch (error) {
    console.error('getWorkers error:', error.message);
    throw error;
  }
};

const getWorkerById = async (id) => {
  console.log('getWorkerById ID:', id);
  try {
    const result = await pool.query('SELECT * FROM workers WHERE id = $1', [
      id,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('getWorkerById error:', error.message);
    throw error;
  }
};

const createWorker = async (worker) => {
  const { name, role, contact, hours, sector } = worker;
  console.log('createWorker:', { name, role, contact, hours, sector });
  try {
    const result = await pool.query(
      'INSERT INTO workers (name, role, contact, hours, sector) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, role, contact, hours, sector || null]
    );
    return result.rows[0];
  } catch (error) {
    console.error('createWorker error:', error.message);
    throw error;
  }
};

const updateWorker = async (id, worker) => {
  const { name, role, contact, hours, sector } = worker;
  console.log('updateWorker ID:', id, { name, role, contact, hours, sector });
  try {
    const result = await pool.query(
      'UPDATE workers SET name = $1, role = $2, contact = $3, hours = $4, sector = $5 WHERE id = $6 RETURNING *',
      [name, role, contact, hours, sector || null, id]
    );
    return result.rows[0];
  } catch (error) {
    console.error('updateWorker error:', error.message);
    throw error;
  }
};

const deleteWorker = async (id) => {
  console.log('deleteWorker ID:', id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch the worker to store in trash
    const workerResult = await client.query(
      'SELECT * FROM workers WHERE id = $1',
      [id]
    );
    if (!workerResult.rows.length) {
      throw new Error('Worker not found');
    }

    // Fetch related work_to_do records
    const workToDoResult = await client.query(
      'SELECT * FROM work_to_do WHERE worker_id = $1',
      [id]
    );

    // Move each work_to_do record to trash
    for (const work of workToDoResult.rows) {
      await client.query(
        'INSERT INTO trash (item_type, item_data, deleted_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
        ['work_to_do', work]
      );
    }

    // Delete related work_to_do records
    await client.query('DELETE FROM work_to_do WHERE worker_id = $1', [id]);

    // Move worker to trash
    await client.query(
      'INSERT INTO trash (item_type, item_data, deleted_at) VALUES ($1, $2, CURRENT_TIMESTAMP)',
      ['workers', workerResult.rows[0]]
    );

    // Delete the worker
    await client.query('DELETE FROM workers WHERE id = $1', [id]);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('deleteWorker error:', error.message);
    throw error;
  } finally {
    client.release();
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
  const orderDirection = ['ASC', 'DESC'].includes(order.toUpperCase())
    ? order.toUpperCase()
    : 'DESC';
  query += ` ORDER BY ${sortField} ${orderDirection} LIMIT $1 OFFSET $2`;
  console.log('getWorkDone query:', query, 'params:', params);
  try {
    const result = await pool.query(query, params);
    const totalQuery = `SELECT COUNT(*) FROM work_done${
      search
        ? ` WHERE task ILIKE $1 OR sector ILIKE $1 OR equipment ILIKE $1 OR status ILIKE $1 OR CAST(cattle_count AS TEXT) ILIKE $1 OR CAST(cost AS TEXT) ILIKE $1 OR CAST(duration AS TEXT) ILIKE $1`
        : ''
    }`;
    const total = await pool.query(totalQuery, search ? [`%${search}%`] : []);
    return { data: result.rows, total: parseInt(total.rows[0].count) };
  } catch (error) {
    console.error('getWorkDone error:', error.message);
    throw error;
  }
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
  console.log('createWorkDone:', {
    task,
    date,
    worker_id,
    sector,
    cattle_count,
    cost,
    duration,
    equipment,
    status,
  });
  try {
    const result = await pool.query(
      'INSERT INTO work_done (task, date, worker_id, sector, cattle_count, cost, duration, equipment, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
      [
        task,
        date || new Date().toISOString().split('T')[0],
        worker_id,
        sector || null,
        cattle_count || null,
        cost || null,
        duration || null,
        equipment || null,
        status || 'completed',
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('createWorkDone error:', error.message);
    throw error;
  }
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
  console.log('updateWorkDone ID:', id, {
    task,
    date,
    worker_id,
    sector,
    cattle_count,
    cost,
    duration,
    equipment,
    status,
  });
  try {
    const result = await pool.query(
      'UPDATE work_done SET task = $1, date = $2, worker_id = $3, sector = $4, cattle_count = $5, cost = $6, duration = $7, equipment = $8, status = $9 WHERE id = $10 RETURNING *',
      [
        task,
        date,
        worker_id,
        sector || null,
        cattle_count || null,
        cost || null,
        duration || null,
        equipment || null,
        status,
        id,
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('updateWorkDone error:', error.message);
    throw error;
  }
};

const deleteWorkDone = async (id) => {
  console.log('deleteWorkDone ID:', id);
  try {
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
  } catch (error) {
    console.error('deleteWorkDone error:', error.message);
    throw error;
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
  let query = 'SELECT * FROM work_to_do WHERE status != $3';
  const params = [limit, offset, 'completed'];
  if (search) {
    query += ` AND (task ILIKE $4 OR sector ILIKE $4 OR equipment ILIKE $4 OR priority ILIKE $4 OR status ILIKE $4 OR CAST(cattle_count AS TEXT) ILIKE $4 OR CAST(cost AS TEXT) ILIKE $4 OR CAST(duration AS TEXT) ILIKE $4 OR CAST(nb AS TEXT) ILIKE $4)`;
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
  const orderDirection = ['ASC', 'DESC'].includes(order.toUpperCase())
    ? order.toUpperCase()
    : 'DESC';
  query += ` ORDER BY ${sortField} ${orderDirection} LIMIT $1 OFFSET $2`;
  console.log('getWorkToDo query:', query, 'params:', params);
  try {
    const result = await pool.query(query, params);
    const totalQuery = `SELECT COUNT(*) FROM work_to_do WHERE status != $1${
      search
        ? ` AND (task ILIKE $2 OR sector ILIKE $2 OR equipment ILIKE $2 OR priority ILIKE $2 OR status ILIKE $2 OR CAST(cattle_count AS TEXT) ILIKE $2 OR CAST(cost AS TEXT) ILIKE $2 OR CAST(duration AS TEXT) ILIKE $2 OR CAST(nb AS TEXT) ILIKE $2)`
        : ''
    }`;
    const total = await pool.query(
      totalQuery,
      search ? ['completed', `%${search}%`] : ['completed']
    );
    return { data: result.rows, total: parseInt(total.rows[0].count) };
  } catch (error) {
    console.error('getWorkToDo error:', error.message);
    throw error;
  }
};

const getWorkToDoById = async (id) => {
  console.log('getWorkToDoById ID:', id);
  try {
    const result = await pool.query('SELECT * FROM work_to_do WHERE id = $1', [
      id,
    ]);
    return result.rows[0];
  } catch (error) {
    console.error('getWorkToDoById error:', error.message);
    throw error;
  }
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
    status,
  } = work;
  console.log('createWorkToDo:', {
    task,
    due_date,
    worker_id,
    sector,
    cattle_count,
    cost,
    duration,
    equipment,
    priority,
    status,
  });
  try {
    const result = await pool.query(
      'INSERT INTO work_to_do (task, due_date, worker_id, sector, cattle_count, cost, duration, equipment, priority, nb, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
      [
        task,
        due_date,
        worker_id,
        sector || null,
        cattle_count || null,
        cost || null,
        duration || null,
        equipment || null,
        priority,
        false,
        status || 'pending',
      ]
    );
    return result.rows[0];
  } catch (error) {
    console.error('createWorkToDo error:', error.message);
    throw error;
  }
};

const updateWorkToDo = async (id, work) => {
  console.log('updateWorkToDo ID:', id, 'data:', work);
  try {
    const fields = [
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
    const updates = [];
    const values = [];
    let paramIndex = 1;
    fields.forEach((field) => {
      if (field in work) {
        updates.push(`${field} = $${paramIndex++}`);
        values.push(
          work[field] === undefined || work[field] === '' ? null : work[field]
        );
      }
    });
    if (updates.length === 0) {
      console.log('updateWorkToDo: No fields to update for ID:', id);
      return await getWorkToDoById(id);
    }
    values.push(id);
    const query = `UPDATE work_to_do SET ${updates.join(
      ', '
    )} WHERE id = $${paramIndex} RETURNING *`;
    console.log('updateWorkToDo query:', query, 'params:', values);
    const result = await pool.query(query, values);
    console.log('updateWorkToDo result:', result.rows[0] || null);
    if (!result.rows[0]) {
      console.error('updateWorkToDo: No rows updated for ID:', id);
      throw new Error('Task not found or update failed');
    }
    return result.rows[0];
  } catch (error) {
    console.error('updateWorkToDo error:', error.message);
    throw error;
  }
};

const completeWorkToDo = async (id) => {
  console.log('completeWorkToDo ID:', id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const taskResult = await client.query(
      'SELECT * FROM work_to_do WHERE id = $1',
      [id]
    );
    if (!taskResult.rows.length) {
      throw new Error('Work to do not found');
    }
    const task = taskResult.rows[0];
    if (task.nb) {
      const workDoneResult = await client.query(
        'INSERT INTO work_done (task, date, worker_id, sector, cattle_count, cost, duration, equipment, status) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
        [
          task.task,
          new Date().toISOString().split('T')[0],
          task.worker_id,
          task.sector || null,
          task.cattle_count || null,
          task.cost || null,
          task.duration || null,
          task.equipment || null,
          'completed',
        ]
      );
      await client.query('DELETE FROM work_to_do WHERE id = $1', [id]);
      await client.query('COMMIT');
      console.log('completeWorkToDo result:', workDoneResult.rows[0]);
      return workDoneResult.rows[0];
    } else {
      await client.query('UPDATE work_to_do SET nb = $1 WHERE id = $2', [
        true,
        id,
      ]);
      await client.query('COMMIT');
      console.log('completeWorkToDo: Set nb=true for ID:', id);
      return await getWorkToDoById(id);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('completeWorkToDo error:', error.message);
    throw error;
  } finally {
    client.release();
  }
};

const deleteWorkToDo = async (id) => {
  console.log('deleteWorkToDo ID:', id);
  try {
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
  } catch (error) {
    console.error('deleteWorkToDo error:', error.message);
    throw error;
  }
};

const getTrash = async (
  page = 1,
  limit = 10,
  sort = 'deleted_at',
  order = 'DESC',
  search = ''
) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT * FROM trash';
  const params = [limit, offset];
  if (search) {
    query += ` WHERE item_type ILIKE $3 OR item_data::text ILIKE $3`;
    params.push(`%${search}%`);
  }
  const validSortFields = ['id', 'item_type', 'deleted_at'];
  const sortField = validSortFields.includes(sort) ? sort : 'deleted_at';
  const orderDirection = ['ASC', 'DESC'].includes(order.toUpperCase())
    ? order.toUpperCase()
    : 'DESC';
  query += ` ORDER BY ${sortField} ${orderDirection} LIMIT $1 OFFSET $2`;
  console.log('getTrash query:', query, 'params:', params);
  try {
    const result = await pool.query(query, params);
    const totalQuery = `SELECT COUNT(*) FROM trash${
      search ? ` WHERE item_type ILIKE $1 OR item_data::text ILIKE $1` : ''
    }`;
    const total = await pool.query(totalQuery, search ? [`%${search}%`] : []);
    return { data: result.rows, total: parseInt(total.rows[0].count) };
  } catch (error) {
    console.error('getTrash error:', error.message);
    throw error;
  }
};

const clearTrash = async () => {
  console.log('clearTrash: Deleting all trash items');
  try {
    const result = await pool.query('DELETE FROM trash RETURNING *');
    return { deleted: result.rowCount };
  } catch (error) {
    console.error('clearTrash error:', error.message);
    throw error;
  }
};

module.exports = {
  getWorkers,
  getWorkerById,
  createWorker,
  updateWorker,
  deleteWorker,
  getWorkDone,
  createWorkDone,
  updateWorkDone,
  deleteWorkDone,
  getWorkToDo,
  getWorkToDoById,
  createWorkToDo,
  updateWorkToDo,
  completeWorkToDo,
  deleteWorkToDo,
  getTrash,
  clearTrash,
};
