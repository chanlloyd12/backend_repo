const db = require('../_helpers/db');

module.exports = {
  getAll,
  getById,
  update,
  create,
  delete: _delete,
  update
};

// Get all workflows
async function getAll() {
  return db.Workflow.findAll({
    include: [
      { model: db.Employee, as: 'employee', attributes: ['employeeId', 'email', 'position'] },
      { model: db.Transfer, as: 'transfer' }
    ],
    order: [['createdAt', 'DESC']]
  });
}

// Get a single workflow
async function getById(id) {
  return db.Workflow.findByPk(id, {
    include: [
      { model: db.Employee, as: 'employee' },
      { model: db.Transfer, as: 'transfer' }
    ]
  });
}

// Create a transfer (auto creates workflow)
async function create(params) {
  if (!params.employeeId) throw 'Employee ID required';
  if (!params.department) throw 'Target department required';

  // ✅ Find the employee and their department
  const employee = await db.Employee.findByPk(params.employeeId, {
    include: [{ model: db.Department, as: 'department' }]
  });
  if (!employee) throw 'Employee not found';

  const fromDept = employee.department?.name || 'Unknown';
  const toDept = params.department;

  // ✅ Create transfer record
  const transfer = await db.Transfer.create({
    employeeId: params.employeeId,
    fromDept,
    toDept,
    status: 'Pending'
  });

  // ✅ Create corresponding workflow record
  await db.Workflow.create({
    type: 'Department Transfer', // 🔥 this fixes your null "type"
    details: `Transfer from ${fromDept} to ${toDept}`,
    employeeId: params.employeeId,
    transferId: transfer.transferId,
    status: 'Pending'
  });

  return transfer;
}

async function update(id, params) {
  const transfer = await getById(id);
  if (!transfer) throw 'Transfer not found';

  Object.assign(transfer, params);
  await transfer.save();

  return transfer;
}

// Delete workflow
async function _delete(id) {
  const workflow = await getById(id);
  if (!workflow) throw 'Workflow not found';
  await workflow.destroy();
}

async function update(id, params) {
  const transfer = await getById(id);
  if (!transfer) throw 'Transfer not found';

  Object.assign(transfer, params);
  await transfer.save();

  return transfer;
}
