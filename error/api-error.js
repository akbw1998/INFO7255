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
}

module.exports = ApiError;