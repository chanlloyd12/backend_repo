const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const service = require('./request.service');

// Routes
router.get('/', authorize([Role.Admin, Role.User]), getAll);
router.get('/:id', authorize([Role.Admin, Role.User]), getById);
router.post('/', authorize([Role.Admin, Role.User]), createSchema, create);
router.put('/:id', authorize([Role.Admin, Role.User]), updateSchema, update);  // needs update()
router.delete('/:id', authorize(Role.Admin), _delete);
router.get('/employee/:employeeId', authorize([Role.Admin, Role.User]), getByEmployeeId);

module.exports = router;

// Controllers
function getAll(req, res, next) {
  service.getAll().then(r => res.json(r)).catch(next);
}

function getById(req, res, next) {
  service.getById(req.params.id).then(r => r ? res.json(r) : res.sendStatus(404)).catch(next);
}

function createSchema(req, res, next) {
  const schema = Joi.object({
    employeeId: Joi.string().required(),
    type: Joi.string().valid('Equipment', 'Leave', 'Resources').required(),
    items: Joi.array().items(
      Joi.object({ name: Joi.string().required(), qty: Joi.number().min(1).default(1) })
    ).optional(),
    status: Joi.string().valid('Pending', 'Approved', 'Rejected').optional()
  });
  validateRequest(req, next, schema);
}

function create(req, res, next) {
  service.create(req.body).then(r => res.json(r)).catch(next);
}

function updateSchema(req, res, next) {
  const schema = Joi.object({
    type: Joi.string().valid('Equipment', 'Leave', 'Resources').optional(),
    items: Joi.array().items(
      Joi.object({ name: Joi.string().required(), qty: Joi.number().min(1).default(1) })
    ).optional(),
    status: Joi.string().valid('Pending', 'Approved', 'Rejected').optional()
  });
  validateRequest(req, next, schema);
}

function update(req, res, next) {
  service.update(req.params.id, req.body)   // <-- FIXED
    .then(r => res.json(r))
    .catch(next);
}

function _delete(req, res, next) {
  service.delete(req.params.id).then(() => res.json({ message: 'Request deleted successfully' })).catch(next);
}

function getByEmployeeId(req, res, next) {
    requestService.getByEmployeeId(req.params.employeeId)
        .then(requests => res.json(requests))
        .catch(next);
}