const Redis = require('redis')

const client = Redis.createClient()

const RedisClientFactory = () => {
   
   return {
      getClient: () =>{
         if(client.isOpen){
            return client
         }
         return client.connect()
      }
   }
}

module.exports = RedisClientFactory