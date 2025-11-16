const db = require('../_helpers/db');

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: _delete,
  getByEmployeeId,
};

// ✅ Helper — formats workflow consistently (UNCHANGED)
function formatWorkflow(workflow) {
  if (!workflow) return null;
  const wf = workflow.toJSON ? workflow.toJSON() : workflow;

  return {
    id: wf.id,
    type: wf.type,
    status: wf.status,
    details: wf.details,
    employeeId: wf.employeeId,
    transferId: wf.transferId,
    requestId: wf.requestId,
    createdAt: wf.createdAt,
    updatedAt: wf.updatedAt,
    employee: wf.employee || null,
    request: wf.request || null,
    transfer: wf.transfer || null,
  };
}

// GET all workflows (Updated to only include essential Transfer fields)
async function getAll() {
  const workflows = await db.Workflow.findAll({
    include: [
      { model: db.Employee, as: 'employee', attributes: ['employeeId', 'positionId', 'departmentId'] },
      { model: db.Request, as: 'request', attributes: ['requestId', 'type', 'employeeId', 'items', 'status'] },
      // Simplified Transfer attributes
      { model: db.Transfer, as: 'transfer', attributes: ['transferId', 'employeeId', 'toPositionId', 'status'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  return workflows.map(formatWorkflow);
}

// GET workflow by ID (Updated to only include essential Transfer fields)
async function getById(id) {
  const wf = await db.Workflow.findByPk(id, {
    include: [
      { model: db.Employee, as: 'employee', attributes: ['employeeId', 'positionId', 'departmentId'] },
      { model: db.Request, as: 'request', attributes: ['requestId', 'type', 'employeeId', 'items', 'status'] },
      // Simplified Transfer attributes
      { model: db.Transfer, as: 'transfer', attributes: ['transferId', 'employeeId', 'toPositionId', 'status'] },
    ],
  });

  if (!wf) throw 'Workflow not found';
  return formatWorkflow(wf);
}

// Create workflow (UNCHANGED)
async function create(params) {
  if (!params.type) throw 'Workflow.type is required';

  const workflow = await db.Workflow.create(params);
  return getById(workflow.id);
}

// ✅ Update workflow — handles approval/rejection actions (REVISED APPROVAL LOGIC)
async function update(id, params) {
  const workflow = await db.Workflow.findByPk(id, {
    // Include all necessary history fields for rollback
    include: [{ 
      model: db.Transfer, 
      as: 'transfer', 
      attributes: ['transferId', 'employeeId', 'fromDept', 'toDept', 'fromPosition', 'toPosition', 'status'] 
    }],
  });
  if (!workflow) throw 'Workflow not found';

  Object.assign(workflow, params);
  await workflow.save();
  
  const transfer = workflow.transfer;

  if (transfer && params.status) {
    // 1. Update transfer status
    await db.Transfer.update({ status: params.status }, { where: { transferId: transfer.transferId } });

    const employee = await db.Employee.findByPk(transfer.employeeId);
    if (!employee) throw 'Employee not found for transfer';

    let targetDeptName, targetPositionName;

    if (params.status === 'Approved') {
      // 🚀 Case 1: APPROVED - Apply the new position and department ("to" values)
      targetDeptName = transfer.toDept;
      targetPositionName = transfer.toPosition;

    } else if (params.status === 'Rejected' || params.status === 'Pending') {
      // ⏪ Case 2 & 3: REJECTED or PENDING - Rollback to the old position and department ("from" values)
      targetDeptName = transfer.fromDept;
      targetPositionName = transfer.fromPosition;
    }
    
    if (targetDeptName && targetPositionName) {
        
        // 2. Look up the ID combination for the target names
        const targetPosition = await db.Position.findOne({
            where: { name: targetPositionName },
            include: [{ 
                model: db.Department, 
                as: 'department', 
                where: { name: targetDeptName },
                attributes: ['id']
            }],
            attributes: ['id', 'departmentId']
        });

        if (!targetPosition || !targetPosition.department) {
            throw `Cannot process status change: Position "${targetPositionName}" in Department "${targetDeptName}" not found.`;
        }
        
        // 3. Apply the position and department IDs to the employee
        employee.departmentId = targetPosition.departmentId; 
        employee.positionId = targetPosition.id; 
        
        await employee.save();
    }
  }

  return getById(id);
}

// Delete workflow (UNCHANGED)
async function _delete(id) {
  const workflow = await db.Workflow.findByPk(id);
  if (!workflow) throw 'Workflow not found';
  await workflow.destroy();
}

// Get workflows by employeeId (Updated to only include essential Transfer fields)
async function getByEmployeeId(employeeId) {
  const workflows = await db.Workflow.findAll({
    where: { employeeId },
    include: [
      { model: db.Employee, as: 'employee', attributes: ['employeeId', 'positionId', 'departmentId'] },
      { model: db.Request, as: 'request', attributes: ['requestId', 'type', 'employeeId', 'items', 'status'] },
      // Simplified Transfer attributes
      { model: db.Transfer, as: 'transfer', attributes: ['transferId', 'employeeId', 'toPositionId', 'status'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  return workflows.map(formatWorkflow);
}