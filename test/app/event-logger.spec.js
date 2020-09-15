'use strict'

const { it } = require('mocha')
const {
  DEFAULT_REQUEST_OBJECT, requestWithClaims, LOGOUT_PATH, AUTH, INTERACTION_PATH, ABORT_PATH, CLIENT_ID,
  jwtSign, PAYLOAD_AUTH, INIT_PATH, OP_ID, REDIRECT_URI, CLIENT_ASSERTION_TYPE, error, TOKEN_PATH,
  getInteractionIdFromInteractionUri, CLIENT
} = require('./fixtures')
const jwt = require('jsonwebtoken')
const { deepEqual } = require('assert').strict

module.exports = function () {
  it('should log when user logout session', async function () {
    const agent = this.agent()
    const requestObject = { ...DEFAULT_REQUEST_OBJECT, ...requestWithClaims }

    const interactionUri = await this.goToSecondInteraction(agent, { requestObject })
    const response = await this.secondInteraction(agent, interactionUri)

    // Get session id
    const sessionCookie = response.request.cookies.split(';').find(cookie => cookie.startsWith('_session='))
    const sessionId = sessionCookie.slice(9)

    this.appender.clear()
    await agent.post(LOGOUT_PATH)
      .expect(302)

    deepEqual(this.appender.output, [
      `[logout] [DEBUG] Session Logout, Session Id ${sessionId}, Uid: ${AUTH}`
    ])
  })

  it('should log when user abort the operation', async function () {
    const agent = this.agent()
    const interactionId = await this.goToConsent(agent)

    this.appender.clear()

    await agent.post(INTERACTION_PATH + interactionId + ABORT_PATH)
      .send({
        id_token: { approved_claims: ['given_name'] },
        approved_scopes: ['openid']
      })
      .expect(302)

    deepEqual(this.appender.output, [
      `[abort] [DEBUG] Interaction Aborted, Client Id ${CLIENT_ID}, Interaction Id: ${interactionId}`,
      `[authorize] [DEBUG] Internal redirect to Authorize. Redirect Path: https://myid.io/authorize/${interactionId}`,
      `[authorize] [DEBUG] Client ID: ${CLIENT_ID}, Error: {"status":400,"error":"access_denied","error_description":"End-User aborted interaction"}`
    ])
  })

  it('should log initiate authorize requests', async function () {
    const assertion = jwtSign(PAYLOAD_AUTH, 30)
    const request = jwtSign(DEFAULT_REQUEST_OBJECT, 30)
    const expected = jwt.decode(request)
    await this.initiateAuthorizeWithSigns(this.request, assertion, request)
      .expect(201)

    deepEqual(this.appender.output, [
      `[initiate-authorize] [DEBUG] Client ID: ${CLIENT_ID}, Request Object: ${JSON.stringify(expected)}`
    ])
  })

  it('should log but prevent sensitive data from leaking', async function () {
    const assertion = jwtSign(PAYLOAD_AUTH, 30)
    const claims = {
      id_token: {
        given_name: { value: 'John' },
        family_name: { values: ['Doe'] },
        assertion_claims: {
          given_name: { purpose: 'purpose', assertion: { $eq: 'John' } }
        }
      },
      userinfo: {}
    }
    const body = { ...DEFAULT_REQUEST_OBJECT, claims }
    const request = jwtSign(body, 30)
    const { iat, nbf, exp, jti } = jwt.decode(request)
    await this.initiateAuthorizeWithSigns(this.request, assertion, request)
    deepEqual(this.appender.output, [
      `[initiate-authorize] [DEBUG] Client ID: ${CLIENT_ID}, ` +
      `Request Object: {"iss":"${CLIENT_ID}","nonce":"nonce-value","aud":"https://op.example.com",` +
      `"response_type":"code","client_id":"${CLIENT_ID}","redirect_uri":"http://127.0.0.1:8080/cb",` +
      '"scope":"openid","claims":{"id_token":{"given_name":{},"family_name":{},' +
      '"assertion_claims":{"given_name":{"purpose":"purpose"}}},"userinfo":{}},' +
      `"iat":${iat},"nbf":${nbf},"exp":${exp},"jti":"${jti}"}`])
  })

  it('should fail if nonce is missing', async function () {
    const requestObject = {
      iss: CLIENT_ID,
      aud: OP_ID,
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      scope: 'openid'
    }
    const jwtSec = jwtSign(PAYLOAD_AUTH, 30)
    const jwtRequest = jwtSign(requestObject, 30)
    await this.request.post(INIT_PATH)
      .send(`client_assertion_type=${CLIENT_ASSERTION_TYPE}`)
      .send(`client_assertion=${jwtSec}`)
      .send(`request=${jwtRequest}`)
      .expect(400, error('invalid_request_object', 'missing required parameter \'nonce\''))

    const expected = {
      status: 400,
      error: 'invalid_request_object',
      error_description: "missing required parameter 'nonce'"
    }
    deepEqual(this.appender.output, [
        `[initiate-authorize] [DEBUG] Client ID: ${CLIENT_ID}, Error: ${JSON.stringify(expected)}`])
  })

  it('should log when interchange a code for an id_token', async function () {
    const agent = this.agent()
    const code = await this.goToToken(agent)
    const jwtSec = jwtSign(PAYLOAD_AUTH)
    this.appender.clear()
    await agent.post(TOKEN_PATH)
      .send(`client_assertion_type=${CLIENT_ASSERTION_TYPE}`)
      .send(`client_assertion=${jwtSec}`)
      .send(`code=${code}`)
      .send('grant_type=authorization_code')
      .send(`redirect_uri=${REDIRECT_URI}`)
      .expect(200)

    deepEqual(this.appender.output, [
      `[token] [DEBUG] Claims consumed for grant. Client ID: ${CLIENT_ID}, Uid: ${AUTH}, Claims: sub, txn, given_name`,
      `[token] [DEBUG] Grant success for Client ID: ${CLIENT_ID}, Uid: ${AUTH}, Sub: e3def28859bc43cad610082f60d663e431f73d1c7a26fc06d8c67ab730978e6f`
    ])
  })

  it('should log when fail token', async function () {
    const agent = this.agent()
    const code = await this.goToToken(agent)
    this.appender.clear()
    await agent.post(TOKEN_PATH)
      .type('form')
      .send(`code=${code}`)
      .send('grant_type=authorization_code')
      .send(`redirect_uri=${REDIRECT_URI}`)
      .expect(400, error('invalid_request', 'no client authentication mechanism provided'))

    deepEqual(this.appender.output, [
      '[token] [DEBUG] Client ID: undefined, Error: {"status":400,"error":"invalid_request","error_description":"no client authentication mechanism provided"}'
    ])
  })

  it('should log errors when invalid grant', async function () {
    const agent = this.agent()
    const code = await this.goToToken(agent)
    const jwtSec = jwtSign(PAYLOAD_AUTH)
    this.appender.clear()
    await agent.post(TOKEN_PATH)
      .send(`client_assertion_type=${CLIENT_ASSERTION_TYPE}`)
      .send(`client_assertion=${jwtSec}`)
      .send(`code=${code}`)
      .send('grant_type=authorization_code')
      .send('redirect_uri=http://other.com/hi')
      .expect(400, error('invalid_grant', 'grant request is invalid'))

    const expected = {
      status: 400,
      error: 'invalid_grant',
      error_description: 'grant request is invalid'
    }

    deepEqual(this.appender.output, [
      `[token] [DEBUG] Client ID: ${CLIENT_ID}, Error: ${JSON.stringify(expected)}`
    ])
  })

  it('should log interaction login request', async function () {
    const agent = this.agent()
    const interactionUri = await this.goToInteraction(agent)
    const interactionId = getInteractionIdFromInteractionUri(interactionUri)
    this.appender.clear()
    const expected = {
      interaction: 'login',
      interaction_id: interactionId,
      interaction_path: `/interaction/${interactionId}/login`,
      redirect_uri: REDIRECT_URI,
      acr: 'any'
    }
    await agent.get(interactionUri).expect(200, expected)
    deepEqual(this.appender.output, [
      '[interaction] [DEBUG] Interaction Login Requested . ' +
      'Client Id: ' + CLIENT_ID + ', ' +
      'Interaction: ' + JSON.stringify(expected)])
  })

  it('should log consent in second interaction', async function () {
    const agent = this.agent()
    const interactionUrl = await this.goToSecondInteraction(agent)
    const interactionId = getInteractionIdFromInteractionUri(interactionUrl)
    this.appender.clear()
    await this.secondInteraction(agent, interactionUrl)
    const expected = {
      interaction: 'consent',
      interaction_id: interactionId,
      interaction_path: `/interaction/${interactionId}/consent`,
      redirect_uri: 'http://127.0.0.1:8080/cb',
      client: CLIENT,
      claims: {
        purpose: 'general purpose',
        id_token: {
          assertion_claims: {},
          given_name: { purpose: 'id_token given_name purpose', ial: 1, result: ['Ju****sé'], unresolved: [], essential: true }
        },
        userinfo: {
          assertion_claims: {}
        }
      },
      scopes: ['openid']
    }
    deepEqual(this.appender.output, [
      `[interaction] [DEBUG] Interaction Consent Requested . Client Id: ${CLIENT_ID}, Interaction: ${JSON.stringify(expected)}`
    ])
  })
}
