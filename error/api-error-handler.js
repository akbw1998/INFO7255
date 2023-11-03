const StatusCodes = require('../utils/status-codes')
const ApiError = require('./api-error')
const {setErrorResponse} = require('../utils/helpers');
const apiErrorHandler = (err, req, res, next) => {
   console.log(`err : `, err)
   if(err instanceof SyntaxError){
      return setErrorResponse(ApiError.badRequest('Invalid payload syntax'),res)
   }
   if(err instanceof ApiError){
      return setErrorResponse(err, res)
   }
   
   const unexpectedServerSideError = {
      msg : 'somethin went wrong',
      code : StatusCodes.INTERNAL_SERVER_ERROR
   }

   return setErrorResponse(unexpectedServerSideError, res)
}

module.exports = apiErrorHandler;