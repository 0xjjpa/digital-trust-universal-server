'use strict'

const { describe, it } = require('mocha')
const { ok } = require('assert').strict

const PIdWhitelist = require('../src/pid-whitelist')

describe('PID Whitelist', function () {
  it('should return true when whitelist is disabled', function () {
    const whitelist = new PIdWhitelist({ enabled: false })
    ok(whitelist.isWhitelisted('whatever'))
  })
  it('should work when no config is provided', function () {
    const whitelist = new PIdWhitelist()
    ok(whitelist.isWhitelisted('whatever'))
  })
})
