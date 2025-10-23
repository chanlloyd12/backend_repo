const db = require('../_helpers/db');

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: _delete,
  getByEmployeeId
};

// GET /requests
async function getAll() {
  const requests = await db.Request.findAll({
    include: [{
      model: db.Employee,
      as: 'employee',
      include: [{ model: db.Account, as: 'account', attributes: ['email'] }]
    }]
  });

  return requests.map(r => ({
    requestId: r.requestId,
    type: r.type,
    employeeId: r.employeeId,
    email: r.employee?.account?.email || null, // safe chaining
    status: r.status,
    items: r.items
  }));
}

// GET /requests/:id
async function getById(id) {
  const request = await db.Request.findOne({
    where: { requestId: id },
    include: [{
      model: db.Employee,
      as: 'employee',
      include: [{ model: db.Account, as: 'account', attributes: ['email'] }]
    }]
  });

  if (!request) throw 'Request not found';

  return {
    requestId: request.requestId,
    type: request.type,
    employeeId: request.employeeId,
    email: request.employee?.account?.email || null,
    status: request.status,
    items: request.items
  };
}

// POST /requests
async function create(params) {
  const t = await db.sequelize.transaction();

  try {
    // Create request
    const request = await db.Request.create(params, { transaction: t });

    // Create workflow
    await db.Workflow.create({
      type: 'Request Approval',
      details: 'Request created',
      requestId: request.requestId,
      employeeId: params.employeeId,
      status: 'Pending'
    }, { transaction: t });

    await t.commit();

    // Fetch request with employee → account → email
    const createdRequest = await db.Request.findOne({
      where: { requestId: request.requestId },
      include: [{
        model: db.Employee,
        as: 'employee',
        include: [{ model: db.Account, as: 'account', attributes: ['email'] }]
      }]
    });

    return {
      requestId: createdRequest.requestId,
      type: createdRequest.type,
      employeeId: createdRequest.employeeId,
      email: createdRequest.employee?.account?.email || null,
      status: createdRequest.status,
      items: createdRequest.items
    };

  } catch (err) {
    await t.rollback();
    throw err;
  }
}

// PUT /requests/:id
async function update(id, params) {
  // 1. Find the actual request instance in the database using the Sequelize model
  const requestInstance = await db.Request.findByPk(id);

  if (!requestInstance) {
    throw 'Request not found';
  }

  // 2. Use the built-in update method to apply changes to the database instance
  await requestInstance.update(params);

  // 3. Re-fetch the updated request using getById to include employee details for the return value
  //    This is crucial because requestInstance.update() returns the raw update result, not the formatted object.
  return getById(id); 
}

// DELETE /requests/:id
async function _delete(id) {
  const request = await getById(id);
  await request.destroy();
}

async function getByEmployeeId(employeeId) {
    const requests = await db.Request.findAll({
        where: { employeeId },
        include: [{ model: db.Employee, as: 'employee', include: [{ model: db.Account, as: 'account', attributes: ['email'] }] }]
    });
    return requests.map(r => ({
        requestId: r.requestId,
        type: r.type,
        employeeId: r.employeeId,
        email: r.employee?.account?.email || null,
        status: r.status,
        items: r.items
    }));
}
