const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const service = require('./department.service');

router.get('/', authorize([Role.Admin, Role.User]), getAll);
router.get('/:id', authorize([Role.Admin, Role.User]), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.put('/:id', authorize(Role.Admin), updateSchema, update);
router.delete('/:id', authorize(Role.Admin), _delete);

module.exports = router;

function getAll(req, res, next) {
    service.getAll()
        .then(depts => res.json(depts))
        .catch(next);
}

function getById(req, res, next) {
    service.getById(req.params.id)
        .then(dept => dept ? res.json(dept) : res.sendStatus(404))
        .catch(next);
}

function createSchema(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().required(),
        description: Joi.string().allow('')
    });
    validateRequest(req, next, schema);
}

function create(req, res, next) {
    service.create(req.body)
        .then(dept => res.json(dept))
        .catch(next);
}

function updateSchema(req, res, next) {
    const schema = Joi.object({
        name: Joi.string().optional(),
        description: Joi.string().allow('')
    });
    validateRequest(req, next, schema);
}

function update(req, res, next) {
    service.update(req.params.id, req.body)
        .then(dept => res.json(dept))
        .catch(next);
}

function _delete(req, res, next) {
    service.delete(req.params.id)
        .then(() => res.json({ message: 'Department deleted successfully' }))
        .catch(next);
}
