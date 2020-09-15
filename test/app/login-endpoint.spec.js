'use strict'

const { describe, it, before, after } = require('mocha')
const sinon = require('sinon')
const {
  error, getInteractionIdFromInteractionUri,
  USER, PASS, AUTH, LOGIN_PATH, INTERACTION_PATH, CLIENT_ID
} = require('./fixtures')
const { resolvers: { UnauthorizedError } } = require('@gruposantander/iamid-provider')
const assert = require('assert')
const { deepStrictEqual, strictEqual } = assert

module.exports = function () {
  it('should redirect to interaction when login succeeded', async function () {
    const agent = this.agent()
    const interactionUrl = await this.goToInteraction(agent)
    const interactionId = getInteractionIdFromInteractionUri(interactionUrl)
    await this.interaction(agent, interactionUrl)
    this.appender.clear()
    await this.login(agent, interactionId)
      .expect('location', interactionUrl)

    assert(this.loginStub.calledOnceWith(USER, PASS))
    deepStrictEqual(this.appender.output, [
      `[login] [DEBUG] Login Success, Client Id ${CLIENT_ID}, Interaction Id: ${interactionId}, UId: ${AUTH}`,
      `[authorize] [DEBUG] Internal redirect to Authorize. Redirect Path: https://myid.io/authorize/${interactionId}`,
      `[authorize] [DEBUG] Interaction End. Client Id: ${CLIENT_ID}, Interaction Id: ${interactionId}`,
      `[authorize] [DEBUG] Interaction Start. Client Id: ${CLIENT_ID}, Interaction Id: ${interactionId}`
    ])
  })

  it('should fail when "session_id" is missing in the request', async function () {
    await this.request.post(LOGIN_PATH)
      .send({ user: USER, pass: PASS })
      .expect(404)
  })

  it('should fail when interaction session does not exist', async function () {
    await this.request.post(INTERACTION_PATH + 'fakeSessionId' + LOGIN_PATH)
      .send({ user: USER, pass: PASS })
      .expect(404, error('session_not_found', 'interaction session id cookie not found'))
  })

  it('should fail with 400 if the JSON parser reports an error [DIGITALID-228]', async function () {
    const agent = this.agent()
    const interactionId = await this.goToLogin(agent)
    this.appender.clear()
    await agent.post(INTERACTION_PATH + interactionId + LOGIN_PATH)
      .set('Content-Type', 'application/json')
      .send('{ "user": "xsstest%00"<>\'", "pass": "13579" }')
      .expect(400, error('invalid_request', 'Unexpected token < in JSON at position 22'))
  })

  it('should fail if "user" field is missing', async function () {
    const agent = this.agent()
    const interactionId = await this.goToLogin(agent)

    this.appender.clear()
    await agent.post(INTERACTION_PATH + interactionId + LOGIN_PATH)
      .send({ pass: PASS })
      .expect(400, error('invalid_request', 'authentication fail'))

    deepStrictEqual(this.appender.output, [
      `[login] [DEBUG] Incorrect credential. Client Id: ${CLIENT_ID}, Interaction Id: ${interactionId}`
    ])
  })

  it('should fail if "pass" field is missing', async function () {
    const agent = this.agent()
    const interactionId = await this.goToLogin(agent)
    await agent.post(INTERACTION_PATH + interactionId + LOGIN_PATH)
      .send({ user: USER })
      .expect(400, error('invalid_request', 'authentication fail'))
  })

  it('should ignore additional fields in the request body', async function () {
    const agent = this.agent()
    const interactionId = await this.goToLogin(agent)

    this.loginStub.resolves(AUTH)
    await agent.post(INTERACTION_PATH + interactionId + LOGIN_PATH)
      .send({ user: USER, pass: PASS, additional: 'wrong' })
      .expect(302)
  })

  it('should control unexpected errors from login', async function () {
    const agent = this.agent()
    const interactionId = await this.goToLogin(agent)

    this.loginStub.throws(() => new Error('Undefined error.'))
    await agent.post(INTERACTION_PATH + interactionId + LOGIN_PATH)
      .send({ user: USER, pass: PASS, additional: 'wrong' })
      .expect(500, error('internal_error', 'Internal Server Error'))
  })

  it('should return an error if authentication fails', async function () {
    const agent = this.agent()
    const interactionId = await this.goToLogin(agent)

    this.loginStub.throws(() => new UnauthorizedError('Invalid Username or Password.'))

    this.appender.clear()
    await agent.post(INTERACTION_PATH + interactionId + LOGIN_PATH)
      .send({ user: USER, pass: PASS })
      .expect(401, error('invalid_credential', 'Invalid Username or Password.'))

    deepStrictEqual(this.appender.output, [
      `[login] [DEBUG] Invalid Username or Password. Client Id: ${CLIENT_ID}, Interaction Id: ${interactionId}`
    ])
  })

  it('should not fail if the login is called twice', async function () {
    const agent = this.agent()
    const interactionId = await this.goToLogin(agent)
    await this.login(agent, interactionId)
    await this.login(agent, interactionId)
  })
  describe('Interaction Session Longer Than User Session', function () {
    before('set up fake timers', function () {
      this.clock = sinon.useFakeTimers()
    })
    after('restore fake timers', function () {
      this.clock.restore()
    })
    it('should ask for a new login instead of going to interaction directly', async function () {
      const agent = this.agent()
      await this.goToSecondInteraction(agent)
      const short = this.cookies.short.maxAge
      const long = this.cookies.long.maxAge
      const diff = long - short + 1
      this.clock.tick(diff)
      const interactionURI = await this.goToInteraction(agent)
      const res = await this.interaction(agent, interactionURI)
      strictEqual(res.body.interaction, 'login')
    })
  })
}
