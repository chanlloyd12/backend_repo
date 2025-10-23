const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const workflowService = require('./workflow.service');

// routes
router.get('/:employeeId', authorize([Role.Admin, Role.User]), getByEmployeeId);
router.get('/', authorize([Role.Admin, Role.User]), getAll);
router.get('/:id', authorize([Role.Admin, Role.User]), getById);
router.put('/:id', authorize(Role.Admin), updateSchema, update);
router.get('/employee/:employeeId', authorize([Role.Admin, Role.User]), getByEmployeeId); 
router.delete('/:id', authorize(Role.Admin), _delete);
router.put('/:id', authorize([Role.Admin]), updateSchema, update);

module.exports = router;

function getAll(req, res, next) {
    workflowService.getAll()
        .then(workflows => res.json(workflows))
        .catch(next);
}

function getById(req, res, next) {
    workflowService.getById(req.params.id)
        .then(workflow => res.json(workflow))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        type: Joi.string().required(),
        details: Joi.string().allow(''),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected'),
        employeeId: Joi.string().required(),
        requestId: Joi.number().optional(),
        transferId: Joi.number().optional()
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    workflowService.create(req.body)
        .then(workflow => res.json(workflow))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        type: Joi.string().optional(),
        details: Joi.string().allow(''),
        status: Joi.string().valid('Pending', 'Approved', 'Rejected'),
        employeeId: Joi.string().optional(),
        requestId: Joi.number().optional(),
        transferId: Joi.number().optional()
    });
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    workflowService.update(req.params.id, req.body)
        .then(workflow => res.json(workflow))
        .catch(next);
}

function _delete(req, res, next) {
    workflowService.delete(req.params.id)
        .then(() => res.json({ message: 'Workflow deleted successfully' }))
        .catch(next);
}

async function getByEmployeeId(req, res, next) {
    try {
        const workflows = await workflowService.getByEmployeeId(req.params.employeeId);
        return res.json(workflows);
    } catch (err) {
        next(err);
    }
}