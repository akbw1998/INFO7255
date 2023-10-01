const crypto = require('crypto');

const setSuccessResponse = (successJson, successStatusCode,  res) => {
   res.status(successStatusCode)
   if(successJson !== null)
      res.json(successJson)
   res.end()
}

const setErrorResponse = (error, res) => {
   res.status(error.code);
   res.json(error.msg)
   res.end()
}

const generateETag = (content) => {
   const contentString = JSON.stringify(content); // Convert the object to a JSON string
   const md5Hash = crypto.createHash('md5').update(contentString).digest('hex');
   return `"${md5Hash}"`; // Wrap the hash in double quotes (standard ETag format)
 }

module.exports = {
   setSuccessResponse,
   setErrorResponse,
   generateETag
}
