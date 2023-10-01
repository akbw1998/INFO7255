const ajvInstance = require('./ajv-instance.js');
const planSchema = require('./plan-schema.json');

module.exports = ajvInstance.compile(planSchema)