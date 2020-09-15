'use strict'

const { describe, it, before, after, beforeEach, afterEach } = require('mocha')
const {
  AUTH_PATH, jwtSign, CLIENT_ID, PAYLOAD_AUTH, CLIENT_ASSERTION_TYPE,
  DEFAULT_REQUEST_OBJECT, INTERACTION_PATH, LOGIN_PATH, USER, PASS, INIT_PATH
} = require('./app/fixtures')
const { app, repositories } = require('../src/universal-op')

const nock = require('nock')
const request = require('supertest')
const { deepStrictEqual } = require('assert')

const USER_QUERY_200 = require('./graphql/resources/user-200')
const CLAIMS_QUERY_200 = require('./graphql/resources/claims-200')

describe('Integration: GraphQL Resolver + OP Server', function () {
  const BASE = 'http://localhost:3000'

  before('Start server and set up request', function (cb) {
    this.server = app.listen(6000, cb)
    this.agent = () => request.agent(this.server)
  })

  after('Stop server', function (cb) {
    this.server.close(cb)
    repositories.close()
  })

  beforeEach(function () {
    nock.disableNetConnect()
    nock(BASE).post('/').reply(200, USER_QUERY_200)
    nock(BASE).post('/').reply(200, CLAIMS_QUERY_200)
    nock.enableNetConnect()
  })

  afterEach('clear nock', function () {
    nock.cleanAll()
  })

  it('should fulfil the contract', async function () {
    const agent = this.agent()
    const requestObject = {
      ...DEFAULT_REQUEST_OBJECT,
      claims: { id_token: { given_name: {} } }
    }
    const jwtSec = jwtSign(PAYLOAD_AUTH)
    const jwtRequest = jwtSign(requestObject)
    const { body: { request_uri: requestURI } } = await agent.post(INIT_PATH)
      .send(`client_assertion_type=${CLIENT_ASSERTION_TYPE}`)
      .send(`client_assertion=${jwtSec}`)
      .send(`request=${jwtRequest}`)
      .expect(201)
    const { header: { location: interactionUri } } = await agent.get(AUTH_PATH)
      .query({ request_uri: requestURI, client_id: CLIENT_ID })
      .expect(302)
    const { body: { interaction_id: interactionId } } = await agent.get(interactionUri).expect(200)
    await agent.post(INTERACTION_PATH + interactionId + LOGIN_PATH)
      .send({ user: USER, pass: PASS })
      .expect(302)
    const { body: { claims } } = await agent.get(interactionUri).expect(200)
    deepStrictEqual(claims, {
      id_token: {
        assertion_claims: {},
        given_name: { ial: 1, result: ['Yo****st'], unresolved: [] }
      },
      userinfo: {
        assertion_claims: {}
      }
    })
  })
})
