const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');

// Load swagger.yaml (place it in the root of your project, e.g. boiler_api/swagger.yaml)
const swaggerDocument = YAML.load('./swagger.yaml');

// Serve Swagger docs at /
router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

module.exports = router;
