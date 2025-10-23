const db = require('../_helpers/db');
const { Op } = require('sequelize');

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: _delete,
};

// 🔹 Get all transfers
async function getAll() {
  return db.Transfer.findAll({
    include: [
      { 
        model: db.Employee, 
        as: 'employee', 
        attributes: ['employeeId', 'email'], // Removed 'position'
        include: [
          { 
            model: db.Position, 
            as: 'positionObj', 
            attributes: ['name'] // Include the position name from the Position model
          }
        ]
      },
    ],
    order: [['createdAt', 'DESC']]
  });
}

// 🔹 Get a single transfer
async function getById(id) {
  return db.Transfer.findByPk(id, {
    include: [{ model: db.Employee, as: 'employee' }]
  });
}

// 🔹 Create a transfer (with full validation)
async function create(params) {
  if (!params.employeeId) throw 'Employee ID required';
  if (!params.department) throw 'Target department required';

  // ✅ Get employee and their current department
  const employee = await db.Employee.findByPk(params.employeeId, {
    include: [{ model: db.Department, as: 'department' }]
  });
  if (!employee) throw 'Employee not found';

  const fromDept = employee.department?.name || 'Unknown';
  const toDept = params.department.trim();

  // (1) 🚫 Prevent same-department transfers
  if (fromDept.toLowerCase() === toDept.toLowerCase()) {
    throw 'Error: Cannot request transfer to the same department.';
  }

  // (2) 🚫 Prevent new transfer if there’s already a Pending one
  const pending = await db.Transfer.findOne({
    where: {
      employeeId: params.employeeId,
      status: { [Op.eq]: 'Pending' }
    }
  });

  if (pending) {
    throw 'Error: You have a pending transfer request. Please wait until it is approved or rejected.';
  }

  // (3) 🚫 Prevent duplicate Pending request for same fromDept → toDept
  const existingActive = await db.Transfer.findOne({
    where: {
      employeeId: params.employeeId,
      fromDept,
      toDept,
      status: { [Op.eq]: 'Pending' }
    }
  });

  if (existingActive) {
    throw 'Error: You already have a pending transfer request for the same departments.';
  }

  // ✅ Create the transfer record
  const transfer = await db.Transfer.create({
    employeeId: params.employeeId,
    fromDept,
    toDept,
    status: 'Pending'
  });

  // ✅ Create linked workflow record
  await db.Workflow.create({
    employeeId: params.employeeId,
    transferId: transfer.transferId,
    type: 'Department Transfer',
    status: 'Pending',
    details: `Transfer request from ${fromDept} to ${toDept}`,
  });


  return {
    message: 'Transfer request created successfully.',
    transfer
  };
}

// 🔹 Update transfer (e.g. approval)
async function update(id, params) {
  const transfer = await getById(id);
  if (!transfer) throw 'Transfer not found';

  Object.assign(transfer, params);
  await transfer.save();

  return transfer;
}

// 🔹 Delete transfer
async function _delete(id) {
  const transfer = await getById(id);
  if (!transfer) throw 'Transfer not found';
  await transfer.destroy();
}
