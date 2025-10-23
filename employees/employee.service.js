const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    getAvailableAccounts,
    getNextId,
    delete: _delete
};

async function getAll() {
    const employees = await db.Employee.findAll({
        include: [
            { model: db.Account, as: 'account', attributes: ['email'] },
            { model: db.Department, as: 'department', attributes: ['id', 'name'] }
        ]
    });

    return employees.map(emp => ({
        employeeId: emp.employeeId,
        accountId: emp.accountId,
        departmentId: emp.department ? emp.department.id : null,
        email: emp.account ? emp.account.email : null,
        position: emp.position,
        hireDate: emp.hireDate,
        status: emp.status,
        department: emp.department ? emp.department.name : null
    }));
}


async function getById(id) {
    const emp = await db.Employee.findByPk(id, {
        include: [
            { model: db.Department, as: 'department', attributes: ['id', 'name'] }
        ]
    });

    if (!emp) throw 'Employee not found';
    return {
        ...emp.toJSON(),
        department: emp.department ? emp.department.name : null
    };
}


async function create(params) {
    // ✅ check if Account exists
    const account = await db.Account.findByPk(params.accountId);
    if (!account) throw 'Account not found. Create an Account first.';

    // ✅ only Active accounts allowed
    if (account.status !== 'Active') {
        throw 'Only Active accounts can be assigned as Employees.';
    }

    // ✅ ensure no duplicate Employee for same Account
    if (await db.Employee.findOne({ where: { accountId: params.accountId } })) {
        throw 'This Account already has an Employee profile';
    }

    // ✅ resolve department name → departmentId
    let departmentId = null;
    if (params.department) {
        const dept = await db.Department.findOne({ where: { name: params.department } });
        if (!dept) throw `Department "${params.department}" not found`;
        departmentId = dept.id;
    }

    // ✅ generate employeeId like EMP001
    const lastEmployee = await db.Employee.findOne({
        order: [['employeeId', 'DESC']]
    });

    let nextNumber = 1;
    if (lastEmployee) {
        nextNumber = parseInt(lastEmployee.employeeId.replace('EMP', '')) + 1;
    }

    const employeeId = 'EMP' + nextNumber.toString().padStart(3, '0');

    // ✅ save new employee with departmentId
    const employee = await db.Employee.create({
        ...params,
        departmentId,   // mapped correctly
        employeeId
    });

    // ✅ re-fetch to include department name instead of departmentId
    const created = await db.Employee.findByPk(employee.employeeId, {
        include: { model: db.Department, as: 'department', attributes: ['name'] },
        attributes: { exclude: ['departmentId'] }
    });

    // flatten department name
    return {
        ...created.toJSON(),
        department: created.department ? created.department.name : null
    };
}

async function update(id, params) {
    const employee = await getEmployee(id);

    // ✅ If department name is provided, map it to departmentId
    if (params.department) {
        const dept = await db.Department.findOne({ where: { name: params.department } });
        if (!dept) throw `Department "${params.department}" not found`;
        params.departmentId = dept.id;
        delete params.department; // remove plain string to avoid confusion
    }

    // ✅ If accountId is being changed, check that the account exists
    if (params.accountId && params.accountId !== employee.accountId) {
        const account = await db.Account.findByPk(params.accountId);
        if (!account) throw 'Account not found';
        if (account.status !== 'Active') throw 'Only Active accounts can be assigned';
        // ensure not already assigned to another employee
        if (await db.Employee.findOne({ where: { accountId: params.accountId } })) {
            throw 'This Account already has an Employee profile';
        }
    }

    // ✅ Apply changes
    Object.assign(employee, params);
    await employee.save();

    // ✅ Re-fetch with associations to keep response consistent
    const updated = await db.Employee.findByPk(employee.employeeId, {
        include: [
            { model: db.Account, as: 'account', attributes: ['email'] },
            { model: db.Department, as: 'department', attributes: ['id', 'name'] }
        ]
    });

    return {
        employeeId: updated.employeeId,
        accountId: updated.accountId,
        departmentId: updated.department ? updated.department.id : null,
        email: updated.account ? updated.account.email : null,
        position: updated.position,
        hireDate: updated.hireDate,
        status: updated.status,
        department: updated.department ? updated.department.name : null
    };
}

async function getAvailableAccounts() {
    const employees = await db.Employee.findAll({ attributes: ['accountId'] });
    const employeeAccountIds = employees.map(e => e.accountId);

    return db.Account.findAll({
        where: {
            status: 'Active',
            id: { [db.Sequelize.Op.notIn]: employeeAccountIds }
        },
        attributes: ['id', 'email']  // only return what frontend needs
    });
}

async function _delete(id) {
    const employee = await getEmployee(id);
    await employee.destroy();
}

// helper
async function getEmployee(id) {
    const employee = await db.Employee.findByPk(id, {
        include: { model: db.Department, as: 'department', attributes: ['name'] }
    });
    if (!employee) throw 'Employee not found';
    return employee;
}

async function getNextId() {
    const lastEmployee = await db.Employee.findOne({
        order: [['employeeId', 'DESC']]
    });

    let nextNumber = 1;
    if (lastEmployee) {
        nextNumber = parseInt(lastEmployee.employeeId.replace('EMP', '')) + 1;
    }

    return 'EMP' + nextNumber.toString().padStart(3, '0');
}