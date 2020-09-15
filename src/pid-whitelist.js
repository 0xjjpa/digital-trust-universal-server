'use strict'

const crypto = require('crypto')

class PIdWhitelist {
  constructor ({ list = [], enabled = false, salt = '' } = {}) {
    const set = new Set(list)
    function isPIdWhitelistedEnabled (pid) {
      const hash = crypto.createHash('sha256')
      const digest = hash.update(pid).update(salt).digest('hex')
      return set.has(digest)
    }
    this.isWhitelisted = enabled ? isPIdWhitelistedEnabled : () => true
  }
}

module.exports = PIdWhitelist
