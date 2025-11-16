const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const service = require('./position.service');

// Routes
router.get('/', authorize([Role.Admin, Role.User]), getAll);
router.get('/:id', authorize([Role.Admin, Role.User]), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', authorize(Role.Admin), updateSchema, update);
router.delete('/:id', authorize(Role.Admin), _delete);

module.exports = router;

// Controller Functions
function getAll(req, res, next) {
    service.getAll()
        .then(positions => res.json(positions))
        .catch(next);
}

function getById(req, res, next) {
    service.getById(req.params.id)
        .then(position => position ? res.json(position) : res.sendStatus(404))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().required(),
        description: Joi.string().allow(''),
        // departmentId is mandatory when creating a position
        departmentId: Joi.number().integer().required()
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    service.create(req.body)
        .then(position => res.json(position))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().optional(),
        description: Joi.string().allow(''),
        departmentId: Joi.number().integer().optional() // Can be updated
    }).min(1); // At least one field is required for update
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    service.update(req.params.id, req.body)
        .then(position => res.json(position))
        .catch(next);
}

function _delete(req, res, next) {
    service.delete(req.params.id)
        .then(() => res.json({ message: 'Position deleted successfully' }))
        .catch(next);
}