const ajvInstance = require('./ajv-instance.js');
const planPostSchema = require('./plan-post-schema.json');
const planPatchSchema = require('./plan-patch-schema.json');

const planPostValidator = ajvInstance.compile(planPostSchema)
const planPatchValidator = ajvInstance.compile(planPatchSchema) 

module.exports = {
   planPostValidator,
   planPatchValidator
}