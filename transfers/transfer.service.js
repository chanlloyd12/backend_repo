const db = require('../_helpers/db');
const { Op } = require('sequelize');

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: _delete,
};

// Helper function to fetch employee data with current department and position
async function getEmployeeTransferData(employeeId) {
  return db.Employee.findByPk(employeeId, {
    include: [
      { model: db.Department, as: 'department', attributes: ['id', 'name'] },
      { model: db.Position, as: 'position', attributes: ['id', 'name', 'departmentId'] }
    ]
  });
}

// 🔹 Get all transfers
async function getAll() {
  return db.Transfer.findAll({
    include: [
      {
        model: db.Employee,
        as: 'employee',
        attributes: ['employeeId', 'email'],
      },
    ],
    order: [['createdAt', 'DESC']]
  });
}

// 🔹 Get a single transfer
async function getById(id) {
  const transfer = await db.Transfer.findByPk(id, {
    include: [{ model: db.Employee, as: 'employee' }]
  });
  if (!transfer) throw 'Transfer not found';
  return transfer;
}

// 🔹 Create a transfer (Atomic Transaction)
async function create(params) {
  if (!params.employeeId) throw 'Employee ID required';
  
  const targetDeptName = params.department ? params.department.trim() : null;
  const targetPositionName = params.position ? params.position.trim() : null;
  
  if (!targetDeptName && !targetPositionName) {
    throw 'Error: Either a target department name or a target position name is required for a transfer request.';
  }

  // 1. Get employee's current data
  const employee = await getEmployeeTransferData(params.employeeId);
  if (!employee) throw 'Employee not found';

  const currentPosition = employee.position;
  const currentDepartment = employee.department;

  const fromDeptName = currentDepartment?.name || 'Unknown Department';
  const fromPositionName = currentPosition?.name || 'Unknown Position';
  
  // 2. Determine Target Position and Department IDs
  let targetDeptId, targetPosId, toDeptName, toPositionName;

  if (targetPositionName && targetDeptName) {
    // Case 1: Department AND Position Transfer
    const targetPosition = await db.Position.findOne({
      where: { name: targetPositionName },
      include: [{ model: db.Department, as: 'department', where: { name: targetDeptName } }]
    });

    if (!targetPosition) throw `Target Position "${targetPositionName}" in Department "${targetDeptName}" not found.`;
    
    targetPosId = targetPosition.id;
    targetDeptId = targetPosition.departmentId;
    toDeptName = targetDeptName;
    toPositionName = targetPositionName;

  } else if (targetPositionName) {
    // Case 2: Position Transfer Only
    if (!currentDepartment) throw 'Cannot perform a Position Transfer: Employee is not currently assigned to a department.';

    const targetPosition = await db.Position.findOne({
      where: { 
        name: targetPositionName, 
        departmentId: currentDepartment.id 
      }
    });

    if (!targetPosition) throw `Target Position "${targetPositionName}" not found in current department "${fromDeptName}".`;

    targetPosId = targetPosition.id;
    targetDeptId = currentDepartment.id;
    toDeptName = fromDeptName;
    toPositionName = targetPositionName;

  } else if (targetDeptName) {
    // Case 3: Department Transfer Only
    const targetDepartment = await db.Department.findOne({ where: { name: targetDeptName } });
    if (!targetDepartment) throw `Target Department "${targetDeptName}" not found.`;

    if (!currentPosition) throw 'Cannot perform a Department Transfer: Employee is not currently assigned to a position.';
    
    const targetPosition = await db.Position.findOne({
      where: { 
        name: fromPositionName,
        departmentId: targetDepartment.id 
      }
    });

    if (!targetPosition) throw `Position "${fromPositionName}" not found in target department "${targetDeptName}". Cannot perform Department Transfer Only.`;

    targetPosId = targetPosition.id;
    targetDeptId = targetDepartment.id;
    toDeptName = targetDeptName;
    toPositionName = fromPositionName;
  }
  
  // 3. Validation: Must be an actual change
  const isPositionChange = currentPosition?.id !== targetPosId;
  const isDepartmentChange = currentDepartment?.id !== targetDeptId;

  if (!isPositionChange && !isDepartmentChange) {
    throw 'Error: Cannot request a transfer as the employee is already in the target position and department.';
  }

  // 🔥🔥🔥 HEAD VALIDATION (INSERTED HERE)
  const targetPositionObj = await db.Position.findByPk(targetPosId);

  if (targetPositionObj.name === 'Head') {
    const existingHead = await db.Employee.findOne({
      where: {
        positionId: targetPosId,
        departmentId: targetDeptId
      }
    });

    if (existingHead && existingHead.employeeId !== params.employeeId) {
      throw `Department Head is already assigned in ${toDeptName}.`;
    }
  }
  // 🔥🔥🔥 END HEAD VALIDATION

  // 4. Pending Request Check
  const pending = await db.Transfer.findOne({
    where: {
      employeeId: params.employeeId,
      status: { [Op.eq]: 'Pending' }
    }
  });

  if (pending) {
    throw 'Error: You have a pending transfer request. Please wait until it is approved or rejected.';
  }
  
  // 5. Duplicate Check
  const existingActive = await db.Transfer.findOne({
    where: {
      employeeId: params.employeeId,
      fromDept: fromDeptName,
      toDept: toDeptName,
      fromPosition: fromPositionName,
      toPosition: toPositionName,
      status: { [Op.eq]: 'Pending' }
    }
  });

  if (existingActive) {
    throw 'Error: You already have a pending transfer request for the same position/department change.';
  }
  
  // Start Transaction
  const t = await db.sequelize.transaction();
  let transfer;

  try {
    transfer = await db.Transfer.create({
      employeeId: params.employeeId,
      fromDept: fromDeptName,
      toDept: toDeptName,
      fromPosition: fromPositionName,
      toPosition: toPositionName,
      toDepartmentId: targetDeptId,
      toPositionId: targetPosId,
      status: 'Pending'
    }, { transaction: t });

    await db.Workflow.create({
      employeeId: params.employeeId,
      transferId: transfer.transferId,
      type: (isPositionChange && isDepartmentChange) ? 'Position/Department Transfer' : 
           (isPositionChange ? 'Position Transfer' : 'Department Transfer'),
      status: 'Pending',
      details: `Transfer request from ${fromPositionName} (${fromDeptName}) to ${toPositionName} (${toDeptName})`,
    }, { transaction: t });

    await t.commit();

    return {
      message: 'Transfer request created successfully.',
      transfer
    };

  } catch (error) {
    await t.rollback();
    throw error;
  }
}

// 🔹 Update transfer
async function update(id, params) {
  const transfer = await getById(id);
  Object.assign(transfer, params);
  await transfer.save();
  return transfer;
}

// 🔹 Delete transfer
async function _delete(id) {
  const transfer = await getById(id);
  await transfer.destroy();
}
