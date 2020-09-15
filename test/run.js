'use strict'

const log4js = require('log4js')

const pkg = require('../package')
const { describe, before, beforeEach, after } = require('mocha')
const appender = require('./appender')

const appenders = process.env.TEST_LOGS ? ['test', 'console'] : ['test']

log4js.configure({
  appenders: {
    test: { type: 'test/appender' },
    console: { type: 'console' }
  },
  categories: {
    default: { appenders, level: 'all' }
  }
})

describe(pkg.name, function () {
  before('prepare logging for tests', function () {
    this.appender = appender
  })

  beforeEach('clear logs', function () {
    this.appender.clear()
  })

  after('clear logs', function (done) {
    log4js.shutdown(done)
  })

  require('./pid-whitelist.spec')
  require('./universal-op.spec')
  describe('Server', require('./app/app.spec'))
})
