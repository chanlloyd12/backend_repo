const express = require('express');
const router = express.Router();
const Joi = require('joi');
const validateRequest = require('../_middleware/validate-request');
const authorize = require('../_middleware/authorize');
const Role = require('../_helpers/role');
const transferService = require('./transfer.service');

// Routes (no PUT here)
router.get('/:id', authorize([Role.Admin, Role.User]), getById);
router.post('/', authorize(Role.Admin), createSchema, create);
router.get('/employee/:employeeId', authorize([Role.Admin, Role.User]), getByEmployeeId);
router.delete('/:id', authorize(Role.Admin), _delete);

module.exports = router;

// Controller functions
function getById(req, res, next) {
  transferService.getById(req.params.id)
    .then(transfer => res.json(transfer))
    .catch(next);
}

function createSchema(req, res, next) {
  const schema = Joi.object({
    employeeId: Joi.string().required(),
    department: Joi.string().required(),
    status: Joi.string().valid('Pending').optional()
  });
  validateRequest(req, next, schema);
}

function create(req, res, next) {
  transferService.create(req.body)
    .then(transfer => res.json(transfer))
    .catch(next);
}

function getByEmployeeId(req, res, next) {
  transferService.getByEmployeeId(req.params.employeeId)
    .then(transfers => res.json(transfers))
    .catch(next);
}

function _delete(req, res, next) {
  transferService.delete(req.params.id)
    .then(() => res.json({ message: 'Transfer deleted successfully' }))
    .catch(next);
}
