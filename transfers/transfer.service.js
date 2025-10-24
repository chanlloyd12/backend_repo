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
        attributes: ['employeeId', 'email'],
        include: [
          { 
            model: db.Position, 
            as: 'positionObj', 
            attributes: ['name']
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

// 🔹 Create a transfer (Atomic Transaction)
async function create(params) {
  // --- Start: Immediate Validation Checks ---

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

  // --- End: Immediate Validation Checks ---
  
  // 🔑 Start Transaction: Ensures Transfer and Workflow are created together (atomicity)
  // Assuming 'db.sequelize' is the Sequelize instance exported from '../_helpers/db'
  const t = await db.sequelize.transaction();
  let transfer;

  try {
    // 1. ✅ Create the transfer record (within transaction)
    transfer = await db.Transfer.create({
      employeeId: params.employeeId,
      fromDept,
      toDept,
      status: 'Pending'
    }, { transaction: t });

    // 2. ✅ Create linked workflow record (within transaction)
    await db.Workflow.create({
      employeeId: params.employeeId,
      transferId: transfer.transferId,
      type: 'Department Transfer',
      status: 'Pending',
      details: `Transfer request from ${fromDept} to ${toDept}`,
    }, { transaction: t });

    // 3. Commit the transaction: Save both records
    await t.commit();

    return {
      message: 'Transfer request created successfully.',
      transfer
    };

  } catch (error) {
    // 4. Rollback the transaction: If any error occurred, neither record is saved
    await t.rollback();
    
    // Re-throw the error so the API route can handle it
    throw error;
  }
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
