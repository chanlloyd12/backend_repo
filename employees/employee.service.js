const db = require('../_helpers/db');

module.exports = {
    getAll,
    getById,
    create,
    update,
    getAvailableAccounts,
    getNextId,
    delete: _delete // Removed getEmployeesByPosition
};

/**
 * Helper function to retrieve the common include options at runtime,
 * which helps prevent model loading errors (circular dependency issues).
 */
const getEmployeeIncludeOptions = () => ([
    { model: db.Account, as: 'account', attributes: ['email'] },
    { model: db.Department, as: 'department', attributes: ['id', 'name'] },
    { model: db.Position, as: 'position', attributes: ['id', 'name'] } 
]);

// --- READ FUNCTIONS ---

/**
 * Retrieves all employees, including linked account email, department name, and position name.
 */
async function getAll() {
    const employees = await db.Employee.findAll({
        include: getEmployeeIncludeOptions()
    });

    // Map the Sequelize instances to a cleaner JSON structure
    return employees.map(emp => ({
        employeeId: emp.employeeId,
        accountId: emp.accountId,
        departmentId: emp.department ? emp.department.id : null,
        positionId: emp.position ? emp.position.id : null, 
        email: emp.account ? emp.account.email : null,
        position: emp.position ? emp.position.name : null, 
        hireDate: emp.hireDate,
        status: emp.status,
        department: emp.department ? emp.department.name : null 
    }));
}

/**
 * Retrieves a single employee by their ID.
 * @param {string} id - The employeeId (e.g., 'EMP001').
 */
async function getById(id) {
    const emp = await db.Employee.findByPk(id, {
        include: getEmployeeIncludeOptions()
    });

    if (!emp) throw 'Employee not found';
    
    // Combine employee details with the department and position names
    return {
        ...emp.toJSON(),
        department: emp.department ? emp.department.name : null,
        position: emp.position ? emp.position.name : null
    };
}

// NOTE: The getEmployeesByPosition function has been removed.

/**
 * Retrieves all 'Active' Accounts that are NOT yet linked to any Employee profile.
 */
async function getAvailableAccounts() {
    // Find all Account IDs currently used by Employees
    const employees = await db.Employee.findAll({ attributes: ['accountId'] });
    const employeeAccountIds = employees.map(e => e.accountId);

    // Find all Active Accounts whose IDs are NOT IN the used list
    return db.Account.findAll({
        where: {
            status: 'Active',
            id: { [db.Sequelize.Op.notIn]: employeeAccountIds }
        },
        attributes: ['id', 'email'] // only return essential data
    });
}

/**
 * Calculates the next available Employee ID (e.g., EMP001, EMP002, etc.).
 */
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

// --- WRITE FUNCTIONS ---

/**
 * Creates a new Employee profile.
 * @param {object} params - Employee parameters including accountId, department (name), and position (name).
 */
async function create(params) {
    // 1. Initial Checks
    const account = await db.Account.findByPk(params.accountId);
    if (!account) throw 'Account not found. Create an Account first.';
    if (account.status !== 'Active') {
        throw 'Only Active accounts can be assigned as Employees.';
    }
    if (await db.Employee.findOne({ where: { accountId: params.accountId } })) {
        throw 'This Account already has an Employee profile';
    }

    let departmentId = null;
    let positionId = null;

    // 2. Resolve Department Name to ID
    if (params.department) {
        const dept = await db.Department.findOne({ where: { name: params.department } });
        if (!dept) throw `Department "${params.department}" not found`;
        departmentId = dept.id;
        delete params.department;
    }

    // 3. Resolve Position Name to ID (Requires resolved departmentId)
    if (params.position) {
        const deptIdForPosition = departmentId || params.departmentId;
        if (!deptIdForPosition) throw 'Department must be specified to resolve Position name.';
        
        const pos = await db.Position.findOne({ 
            where: { 
                name: params.position,
                departmentId: deptIdForPosition
            } 
        });
        if (!pos) throw `Position "${params.position}" not found in department ID ${deptIdForPosition}`;
        positionId = pos.id;
        delete params.position;

        // 🛑 Prevent multiple "Head" positions in the same department
        if (pos.name.toLowerCase() === 'head') {
            const existingHead = await db.Employee.findOne({
                where: { departmentId: deptIdForPosition, positionId: pos.id }
            });
            if (existingHead) {
                throw `Department Head is already assigned in this department.`;
            }
        }
    }

    // 4. Generate ID and Save
    const employeeId = await getNextId();

    const employee = await db.Employee.create({
        ...params,
        departmentId,
        positionId,
        employeeId
    });

    // 5. Re-fetch for clean response
    const created = await db.Employee.findByPk(employee.employeeId, {
        include: getEmployeeIncludeOptions()
    });

    return {
        ...created.toJSON(),
        department: created.department ? created.department.name : null,
        position: created.position ? created.position.name : null
    };
}

/**
 * Updates an existing Employee profile.
 * @param {string} id - The employeeId.
 * @param {object} params - The fields to update.
 */
async function update(id, params) {
    const employee = await getEmployee(id);
    
    let currentOrNewDepartmentId = employee.departmentId;

    // 1. Resolve Department Name to ID
    if (params.department) {
        const dept = await db.Department.findOne({ where: { name: params.department } });
        if (!dept) throw `Department "${params.department}" not found`;
        params.departmentId = dept.id;
        currentOrNewDepartmentId = dept.id;
        delete params.department;
    }

    // 2. Resolve Position Name to ID (Requires resolved/current departmentId)
    if (params.position) {
        const deptIdForPosition = params.departmentId || currentOrNewDepartmentId;
        if (!deptIdForPosition) throw 'Department must be specified to resolve Position name.';

        const pos = await db.Position.findOne({ 
            where: { 
                name: params.position,
                departmentId: deptIdForPosition
            } 
        });
        if (!pos) throw `Position "${params.position}" not found in department ID ${deptIdForPosition}`;
        
        params.positionId = pos.id;
        delete params.position;

        // 🛑 Prevent assigning another Head in the same department
        if (pos.name.toLowerCase() === 'head') {
            const existingHead = await db.Employee.findOne({
                where: {
                    departmentId: deptIdForPosition,
                    positionId: pos.id,
                    employeeId: { [db.Sequelize.Op.ne]: id } // exclude current employee
                }
            });
            if (existingHead) {
                throw `Department Head is already assigned in this department.`;
            }
        }
    }

    // 3. Account ID Change Checks
    if (params.accountId && params.accountId !== employee.accountId) {
        const account = await db.Account.findByPk(params.accountId);
        if (!account) throw 'Account not found';
        if (account.status !== 'Active') throw 'Only Active accounts can be assigned';
        
        if (await db.Employee.findOne({ 
            where: { 
                accountId: params.accountId,
                employeeId: { [db.Sequelize.Op.ne]: employee.employeeId }
            } 
        })) {
            throw 'This Account already has an Employee profile';
        }
    }

    // 4. Apply changes and save
    Object.assign(employee, params);
    await employee.save();

    // 5. Re-fetch with associations
    const updated = await db.Employee.findByPk(employee.employeeId, {
        include: getEmployeeIncludeOptions()
    });

    return {
        employeeId: updated.employeeId,
        accountId: updated.accountId,
        departmentId: updated.department ? updated.department.id : null,
        positionId: updated.position ? updated.position.id : null,
        email: updated.account ? updated.account.email : null,
        position: updated.position ? updated.position.name : null,
        hireDate: updated.hireDate,
        status: updated.status,
        department: updated.department ? updated.department.name : null
    };
}

/**
 * Deletes an Employee profile.
 * @param {string} id - The employeeId.
 */
async function _delete(id) {
    const employee = await getEmployee(id);
    await employee.destroy();
}

// --- HELPER FUNCTION ---

/**
 * Helper to fetch an Employee instance or throw an error if not found.
 * @param {string} id - The employeeId.
 */
async function getEmployee(id) {
    const employee = await db.Employee.findByPk(id, {
        include: [
            { model: db.Department, as: 'department', attributes: ['name'] },
            { model: db.Position, as: 'position', attributes: ['name'] }
        ]
    });
    if (!employee) throw 'Employee not found';
    return employee;
}