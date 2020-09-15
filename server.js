'use strict'

const log4js = require('log4js').configure('config/log.json')
const pkg = require('./package')
const logger = log4js.getLogger('server')
const port = process.env.PORT || 8080
const { app, repositories } = require('./src/universal-op')
app.listen(port, () => {
  logger.info(`${pkg.description} listening on port ${port}`)
}).on('close', () => {
  repositories.close()
})
