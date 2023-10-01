const planRouter = require('./plan-route');

const routes = (app) => {
   app.use('/', planRouter);
}

module.exports = routes