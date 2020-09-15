'use strict'
require('dotenv').config()
const { describe, it } = require('mocha')
const Client = require('../src/graphql/client')
const client = new Client()
const fs = require('fs')
const jwt = require('jsonwebtoken')
const request = require('supertest')
const { randomFillSync } = require('crypto')

const { MB_USER, MB_PASS } = process.env

const CLIENT_PRIVATE_KEY = fs.readFileSync('./test/resources/private-key.pem')
const KEY_ID = '259337db-7412-45da-ad86-b63c97796588'
const DOMAIN = 'http://localhost:8080'

// const DOMAIN = 'https://op-server-verifiedid-pro.e4ff.pro-eu-west-1.openshiftapps.com'
const INIT_PATH = DOMAIN + '/initiate-authorize'
const CLIENT_ID = 'TEST-2754efa75e8c4d11a6d7f95b90cd8e40-TEST'
const CLIENT_ASSERTION_TYPE = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'

const OP_ID = 'https://op.iamid.io'

const PAYLOAD_AUTH = Object.freeze({
  aud: OP_ID,
  iss: CLIENT_ID,
  sub: CLIENT_ID
})

function jwtSign (payload) {
  return jwt.sign(payload, CLIENT_PRIVATE_KEY, {
    algorithm: 'RS256',
    keyid: KEY_ID,
    expiresIn: 60,
    notBefore: 0,
    jwtid: `jwt-${randomFillSync(Buffer.alloc(10)).toString('hex')}`
  })
}

describe('System Test', function () {
  this.timeout(60000)
  describe('Full Happy Path', function () {
    it('should complete a full journey', async function () {
      const agent = request.agent()
      const requestObject = {
        iss: CLIENT_ID,
        aud: OP_ID,
        response_type: 'code',
        client_id: CLIENT_ID,
        redirect_uri: 'http://127.0.0.1:8080/cb',
        scope: 'openid',
        nonce: 'nonce-value',
        claims: {
          purpose: 'general purpose',
          id_token: {
            given_name: { essential: true, purpose: 'id_token given_name purpose' },
            total_balance: { essential: true, purpose: 'id_token total_balance purpose' }
          },
          userinfo: {
            family_name: { purpose: 'userinfo family_name purpose' },
            given_name: { essential: true, purpose: 'userinfo given_name purpose' },
            total_balance: { essential: true, purpose: 'userinfo total_balance purpose' },
            email: { essential: true, purpose: 'userinfo email purpose' },
            phone_number: { essential: true, purpose: 'userinfo phone_number purpose' },
            birthdate: { essential: true, purpose: 'userinfo birthdate purpose' },
            custard_apple: { essential: true, purpose: 'userinfo custard_apple purpose' }
          }
        }
      }
      const jwtSec = jwtSign(PAYLOAD_AUTH)
      const jwtRequest = jwtSign(requestObject)
      const initResponse = await agent.post(INIT_PATH)
        .send(`client_assertion_type=${CLIENT_ASSERTION_TYPE}`)
        .send(`client_assertion=${jwtSec}`)
        .send(`request=${jwtRequest}`)
      console.log(initResponse)
    })
  })

  describe('User Login', function () {
    it('should return valid credentials', async function () {
      const uid = await client.obtainUid(MB_USER)
      const token = await client.token(uid, MB_PASS)
      console.log(token)
    })
  })

  describe('GraphQL Client', function () {
    it('Should return all claims', async function () {
      const uid = await client.obtainUid(MB_USER)
      const token = await client.token(uid, MB_PASS)
      console.log(token)
      const data = await client.userClaimsQuery(token.access_token)
      console.log(data)
    })
  })
})
