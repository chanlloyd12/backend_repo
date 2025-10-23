const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    delete: _delete
};

// ✅ Get all departments with employeeCount
async function getAll() {
    const departments = await db.Department.findAll({
        include: [{ model: db.Employee, as: 'employees', attributes: ['employeeId'] }]
    });

    return departments.map(dept => ({
        id: dept.id,
        name: dept.name,
        description: dept.description,
        employeeCount: dept.employees ? dept.employees.length : 0
    }));
}

// ✅ Get department by ID with employeeCount
async function getById(id) {
    const dept = await db.Department.findByPk(id, {
        include: [{ model: db.Employee, as: 'employees' }]
    });
    if (!dept) throw 'Department not found';

    return {
        ...dept.toJSON(),
        employeeCount: dept.employees ? dept.employees.length : 0
    };
}

// ✅ Create new department
async function create(params) {
    if (await db.Department.findOne({ where: { name: params.name } })) {
        throw `Department "${params.name}" already exists`;
    }

    const dept = await db.Department.create(params);
    return {
        id: dept.id,
        name: dept.name,
        description: dept.description,
        employeeCount: 0
    };
}

// ✅ Update department
async function update(id, params) {
    const dept = await db.Department.findByPk(id);
    if (!dept) throw 'Department not found';

    if (params.name && params.name !== dept.name) {
        if (await db.Department.findOne({ where: { name: params.name } })) {
            throw `Department "${params.name}" already exists`;
        }
    }

    Object.assign(dept, params);
    await dept.save();

    // re-fetch with employees for accurate count
    const updated = await db.Department.findByPk(id, {
        include: [{ model: db.Employee, as: 'employees', attributes: ['employeeId'] }]
    });

    return {
        id: updated.id,
        name: updated.name,
        description: updated.description,
        employeeCount: updated.employees ? updated.employees.length : 0
    };
}

// ✅ Delete department
async function _delete(id) {
    const dept = await db.Department.findByPk(id);
    if (!dept) throw 'Department not found';

    await dept.destroy();
}
