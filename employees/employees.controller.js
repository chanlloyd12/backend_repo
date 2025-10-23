const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const employeeService = require('./employee.service');
const db = require('../_helpers/db'); // ✅ make sure you import db

// routes
router.get('/', authorize([Role.Admin, Role.User]), getAll);
router.get('/next-id', authorize(Role.Admin), getNextId); // ✅ moved BEFORE :id
router.get('/:id', authorize([Role.Admin, Role.User]), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', authorize(Role.Admin), updateSchema, update);
router.get('/available-accounts', authorize(Role.Admin), getAvailableAccounts);
router.delete('/:id', authorize(Role.Admin), _delete);

module.exports = router;

// ===== handlers =====

function getAll(req, res, next) {
    employeeService.getAll()
        .then(employees => res.json(employees))
        .catch(next);
}

function getById(req, res, next) {
    employeeService.getById(req.params.id)
        .then(employee => employee ? res.json(employee) : res.sendStatus(404))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        accountId: Joi.number().required(),
        department: Joi.string().required(),
        position: Joi.string().optional(),
        hireDate: Joi.date().required(),
        status: Joi.string().required()
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    employeeService.create(req.body)
        .then(employee => res.json(employee))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        department: Joi.string().empty(''),
        position: Joi.string().empty(''),
        hireDate: Joi.date().empty(''),
        status: Joi.string().valid('Active', 'Inactive').optional()
    });
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    employeeService.update(req.params.id, req.body)
        .then(employee => res.json(employee))
        .catch(next);
}

function getAvailableAccounts(req, res, next) {
    employeeService.getAvailableAccounts()
        .then(accounts => res.json(accounts))
        .catch(next);
}

async function getNextId(req, res, next) {
    try {
        const lastEmployee = await db.Employee.findOne({
            order: [['employeeId', 'DESC']]
        });

        let nextNumber = 1;
        if (lastEmployee && lastEmployee.employeeId) {
            nextNumber = parseInt(lastEmployee.employeeId.replace('EMP', '')) + 1;
        }

        const employeeId = 'EMP' + nextNumber.toString().padStart(3, '0');
        res.json({ employeeId });
    } catch (err) {
        next(err);
    }
}

function _delete(req, res, next) {
    employeeService.delete(req.params.id)
        .then(() => res.json({ message: 'Employee deleted successfully' }))
        .catch(next);
}
