const db = require('../_helpers/db');

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: _delete,
  getByEmployeeId,
};

// ✅ Helper — formats workflow consistently
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

// GET all workflows
async function getAll() {
  const workflows = await db.Workflow.findAll({
    include: [
      { model: db.Employee, as: 'employee', attributes: ['employeeId', 'position', 'departmentId'] },
      { model: db.Request, as: 'request', attributes: ['requestId', 'type', 'employeeId', 'items', 'status'] },
      { model: db.Transfer, as: 'transfer', attributes: ['transferId', 'fromDept', 'toDept', 'status'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  return workflows.map(formatWorkflow);
}

// GET workflow by ID
async function getById(id) {
  const wf = await db.Workflow.findByPk(id, {
    include: [
      { model: db.Employee, as: 'employee', attributes: ['employeeId', 'position', 'departmentId'] },
      { model: db.Request, as: 'request', attributes: ['requestId', 'type', 'employeeId', 'items', 'status'] },
      { model: db.Transfer, as: 'transfer', attributes: ['transferId', 'fromDept', 'toDept', 'status'] },
    ],
  });

  if (!wf) throw 'Workflow not found';
  return formatWorkflow(wf);
}

// Create workflow
async function create(params) {
  if (!params.type) throw 'Workflow.type is required';

  const workflow = await db.Workflow.create(params);
  return getById(workflow.id);
}

// Update workflow — handles approval/rejection actions
async function update(id, params) {
  const workflow = await db.Workflow.findByPk(id, {
    include: [{ model: db.Transfer, as: 'transfer' }],
  });
  if (!workflow) throw 'Workflow not found';

  // ✅ Update workflow fields
  Object.assign(workflow, params);
  await workflow.save();

  // ✅ Handle linked Request
  if (workflow.requestId) {
    const request = await db.Request.findByPk(workflow.requestId);
    if (request && params.status) {
      request.status = params.status;
      await request.save();
    }
  }

  // ✅ Handle linked Transfer + Department Update when approved
  if (workflow.transferId) {
    const transfer = await db.Transfer.findByPk(workflow.transferId);
    if (transfer && params.status) {
      transfer.status = params.status;
      await transfer.save();

      if (params.status === 'Approved') {
        const employee = await db.Employee.findByPk(transfer.employeeId);
        const newDept = await db.Department.findOne({ where: { name: transfer.toDept } });
        if (employee && newDept) {
          employee.departmentId = newDept.id;
          employee.department = newDept.name; // optional, if you store string too
          await employee.save();
        }
      }
    }
  }

  return getById(id);
}

// Delete workflow
async function _delete(id) {
  const workflow = await db.Workflow.findByPk(id);
  if (!workflow) throw 'Workflow not found';
  await workflow.destroy();
}

// Get workflows by employeeId
async function getByEmployeeId(employeeId) {
  const workflows = await db.Workflow.findAll({
    where: { employeeId },
    include: [
      { model: db.Employee, as: 'employee', attributes: ['employeeId', 'position', 'departmentId'] },
      { model: db.Request, as: 'request', attributes: ['requestId', 'type', 'employeeId', 'items', 'status'] },
      { model: db.Transfer, as: 'transfer', attributes: ['transferId', 'fromDept', 'toDept', 'status'] },
    ],
    order: [['createdAt', 'DESC']],
  });

  return workflows.map(formatWorkflow);
}
