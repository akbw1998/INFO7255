const express = require('express');
const routes = require('./routes/index');
const apiErrorHandler = require('./error/api-error-handler')
const app = express()

// add general req-json/req-urlencoded parsing middlewares to app
app.use(express.json())
app.use(express.urlencoded({extended: true}))

// attach routes to app
routes(app)

// attach error handling middleware to app
app.use(apiErrorHandler)

module.exports = app;