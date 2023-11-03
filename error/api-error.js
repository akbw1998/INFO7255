const StatusCodes = require('../utils/status-codes')

class ApiError{
   constructor(msg, code){
      this.msg = msg;
      this.code = code;
   }
   
   static badRequest(msg){
      return new ApiError(msg, StatusCodes.BAD_REQUEST) 
   }

   static notFound(msg){
      return new ApiError(msg, StatusCodes.NOT_FOUND) 
   }

   static conflict(msg){
      return new ApiError(msg, StatusCodes.CONFLICT)
   }

   static notAllowed(msg){
      return new ApiError(msg, StatusCodes.NOT_ALLOWED)
   }

   static serviceUnavailable(msg){
      return new ApiError(msg, StatusCodes.SERVICE_UNAVAILABLE)
   }

   static unauthorized(msg){
      return new ApiError(msg, StatusCodes.UNAUTHORIZED)
   }

   static forbidden(msg){
      return new ApiError(msg, StatusCodes.FORBIDDEN)
   }

   static preconditionFailed(msg){
      return new ApiError(msg, StatusCodes.PRECONDITION_FAILED)
   }

   static preconditionRequired(msg){
      return new ApiError(msg, StatusCodes.PRECONDITION_REQUIRED)
   }
}

module.exports = ApiError;