const db = require('../_helpers/db');
const { fn, col } = require('sequelize');

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

// Helper function to check for uniqueness within a department
async function checkNameInDepartment(name, departmentId, excludeId = null) {
    const where = { 
        name, 
        departmentId 
    };
    if (excludeId) {
        where.id = { [db.sequelize.Op.ne]: excludeId };
    }
    
    const existingPosition = await db.Position.findOne({ where });

    if (existingPosition) {
        throw `Position name "${name}" already exists in department ID ${departmentId}. Each position name must be unique within its department.`;
    }
}

async function checkHeadLimit(name, departmentId, excludeId = null) {
    if (name.toLowerCase() !== 'head') return;

    const where = { 
        name: 'Head', 
        departmentId 
    };
    if (excludeId) {
        where.id = { [db.sequelize.Op.ne]: excludeId };
    }

    const existingHead = await db.Position.findOne({ where });
    if (existingHead) {
        throw `Department Head already exists in this department. Only one "Head" position is allowed per department.`;
    }
}

// ✅ Get all positions with department name and employeeCount
async function getAll() {
    // 1️⃣ Get all positions with their departments
    const positions = await db.Position.findAll({
        include: [
            {
                model: db.Department,
                as: 'department',
                attributes: ['id', 'name']
            }
        ]
    });

    // 2️⃣ Get all employees (with department + position)
    const employees = await db.Employee.findAll({
        attributes: ['employeeId', 'departmentId', 'positionId'],
        include: [
            {
                model: db.Position,
                as: 'position',
                attributes: ['name']
            }
        ]
    });

    // 3️⃣ Manually count employees per department+position name
    const results = positions.map(pos => {
        const count = employees.filter(e =>
            e.departmentId === pos.departmentId &&
            e.position?.name === pos.name
        ).length;

        return {
            id: pos.id,
            name: pos.name,
            description: pos.description,
            departmentId: pos.department?.id || null,
            departmentName: pos.department?.name || null,
            employeeCount: count
        };
    });

    return results;
}


// ✅ Get position by ID with department name and employeeCount
async function getById(id) {
    const pos = await db.Position.findByPk(id, {
        include: [
            { model: db.Employee, as: 'employees', attributes: ['employeeId'] },
            { model: db.Department, as: 'department', attributes: ['name'] }
        ]
    });
    if (!pos) throw 'Position not found';

    const posJson = pos.toJSON();

    return {
        ...posJson,
        departmentName: pos.department ? pos.department.name : 'N/A',
        employeeCount: pos.employees ? pos.employees.length : 0
    };
}

// ✅ Create new position
async function create(params) {
    if (!await db.Department.findByPk(params.departmentId)) {
        throw `Department with ID ${params.departmentId} not found`;
    }

    await checkNameInDepartment(params.name, params.departmentId);
    await checkHeadLimit(params.name, params.departmentId); // 👈 added

    const pos = await db.Position.create(params);

    const department = await db.Department.findByPk(pos.departmentId, { attributes: ['name'] });
    return {
        id: pos.id,
        name: pos.name,
        description: pos.description,
        departmentId: pos.departmentId,
        departmentName: department ? department.name : 'N/A',
        employeeCount: 0
    };
}

// ✅ Update position
async function update(id, params) {
    const pos = await db.Position.findByPk(id);
    if (!pos) throw 'Position not found';

    const departmentIdToCheck = params.departmentId || pos.departmentId;

    if (params.departmentId && !await db.Department.findByPk(params.departmentId)) {
        throw `Department with ID ${params.departmentId} not found`;
    }

    if (params.name && params.name !== pos.name || params.departmentId) {
        await checkNameInDepartment(params.name || pos.name, departmentIdToCheck, id);
        await checkHeadLimit(params.name || pos.name, departmentIdToCheck, id); // 👈 added
    }

    Object.assign(pos, params);
    await pos.save();

    const updated = await db.Position.findByPk(id, {
        include: [
            { model: db.Employee, as: 'employees', attributes: ['employeeId'] },
            { model: db.Department, as: 'department', attributes: ['name'] }
        ]
    });

    return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        departmentId: updated.departmentId,
        departmentName: updated.department ? updated.department.name : 'N/A',
        employeeCount: updated.employees ? updated.employees.length : 0
    };
}


// Helper: Only one "Head" per department
async function checkHeadLimit(name, departmentId, excludeId = null) {
    if (name.toLowerCase() !== 'head') return;

    const where = { 
        name: 'Head', 
        departmentId 
    };
    if (excludeId) {
        where.id = { [db.sequelize.Op.ne]: excludeId };
    }

    const existingHead = await db.Position.findOne({ where });
    if (existingHead) {
        throw `Department Head already exists in this department. Only one "Head" position is allowed per department.`;
    }
}

// ✅ Delete position
async function _delete(id) {
    const pos = await db.Position.findByPk(id);
    if (!pos) throw 'Position not found';

    await pos.destroy();
}