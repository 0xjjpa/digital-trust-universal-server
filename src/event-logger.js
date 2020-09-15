'use strict'
const jwt = require('jsonwebtoken')
const log4js = require('log4js')
const { CredentialValidationError, UnauthorizedContextError } = require('./interaction-router')
const { utils: { UserNotMatchError } } = require('@gruposantander/iamid-provider')

const initiateAuthorizeLogger = log4js.getLogger('initiate-authorize')
const authorizeLogger = log4js.getLogger('authorize')
const interactionLogger = log4js.getLogger('interaction')
const loginLogger = log4js.getLogger('login')
const consentLogger = log4js.getLogger('consent')
const tokenLogger = log4js.getLogger('token')
const errorLogger = log4js.getLogger('error')
const abortLogger = log4js.getLogger('abort')
const logoutLogger = log4js.getLogger('logout')

function filterError (errorObject) {
  const { status, error, error_description: description } = errorObject
  return { status, error, error_description: description }
}

const sensitive = ['value', 'values', 'assertion']

function initiateAuthorizeSuccess (ctx) {
  const request = jwt.decode(ctx.oidc.body.request)
  initiateAuthorizeLogger.debug(
    'Client ID: %s, Request Object: %s',
    ctx.oidc.client.clientId,
    JSON.stringify(request, function (key, value) {
      if (sensitive.includes(key)) {
        return undefined
      }
      return value
    }))
}

function initiateAuthorizeError (ctx, error) {
  initiateAuthorizeLogger.debug(
    'Client ID: %s, Error: %j',
    ctx.oidc.client && ctx.oidc.client.clientId,
    filterError(error))
}

function authorizeSuccess (ctx) {
  authorizeLogger.debug(
    'Authorization Success with Client ID: %s',
    ctx.oidc.client && ctx.oidc.client.clientId
  )
}

function authorizeError (ctx, error) {
  authorizeLogger.debug(
    'Client ID: %s, Error: %j',
    ctx.oidc.client && ctx.oidc.client.clientId,
    filterError(error))
}

function interactionStart (ctx, promptDetail) {
  const { oidc: { client: { clientId }, uid } } = ctx
  authorizeLogger.debug(
    'Interaction Start. Client Id: %s, Interaction Id: %s',
    clientId,
    uid
  )
}

function interactionEnd (ctx) {
  const { oidc: { client: { clientId }, uid } } = ctx
  authorizeLogger.debug(
    'Interaction End. Client Id: %s, Interaction Id: %s',
    clientId,
    uid
  )
}

function redirectAuthorize (ctx, interactionPath) {
  authorizeLogger.debug(
    'Internal redirect to Authorize. Redirect Path: %s',
    interactionPath
  )
}

function grantSuccess (ctx) {
  tokenLogger.debug(
    'Grant success for Client ID: %s, Uid: %s, Sub: %s',
    ctx.oidc.client.clientId,
    ctx.oidc.entities.Account.accountId,
    jwt.decode(ctx.body.id_token).sub
  )
}

function grantError (ctx, error) {
  tokenLogger.debug(
    'Client ID: %s, Error: %j',
    ctx.oidc.client && ctx.oidc.client.clientId,
    filterError(error))
}

function claimsConsumed (ctx, consent, id, claims) {
  tokenLogger.debug(
    'Claims consumed for grant. Client ID: %s, Uid: %s, Claims: %s',
    ctx.oidc.client && ctx.oidc.client.clientId,
    id, Object.keys(claims).join(', ')
  )
}

function interactionLogin (ctx, context) {
  interactionLogger.debug(
    'Interaction Login Requested . Client Id: %s, Interaction: %j',
    context.params.client_id,
    ctx.body
  )
}

function interactionConsent (ctx, context) {
  interactionLogger.debug(
    'Interaction Consent Requested . Client Id: %s, Interaction: %j',
    context.params.client_id,
    ctx.body
  )
}

function login (ctx, context, uid) {
  loginLogger.debug(
    'Login Success, Client Id %s, Interaction Id: %s, UId: %s',
    context.params.client_id,
    context.uid,
    uid
  )
}

function consent (ctx, context, consent) {
  consentLogger.debug(
    'Consent Success, Client Id %s, Interaction Id: %s, Accepted: %j',
    context.params.client_id,
    context.uid,
    consent.accepted
  )
}

function abort (ctx, context) {
  abortLogger.debug(
    'Interaction Aborted, Client Id %s, Interaction Id: %s',
    context.params.client_id,
    context.uid
  )
}

function logout (ctx, session) {
  logoutLogger.debug(
    'Session Logout, Session Id %s, Uid: %s',
    session.jti,
    session.account
  )
}

function error (err, ctx) {
  if (err instanceof CredentialValidationError) {
    loginLogger.debug('Incorrect credential. Client Id: %s, Interaction Id: %s', err.context.params.client_id, err.context.uid)
  } else if (err instanceof UnauthorizedContextError) {
    // loginLogger.debug('User is not in the whitelist. Client Id: %s, Interaction Id: %s', err.context.params.client_id, err.context.uid)
    loginLogger.debug('%s Client Id: %s, Interaction Id: %s', err.message, err.context.params.client_id, err.context.uid)
  } else if (err instanceof UserNotMatchError) {
    consentLogger.debug('User does not match. Client Id: %s, Interaction Id: %s', err.context.params.client_id, err.context.uid)
  } else {
    errorLogger.debug(err)
  }
}

/**
 * @param {import('@santander/oidc-provider').Provider} provider
 * @param {import('koa')} app
 */
function registerEventEmitters (app) {
  if (initiateAuthorizeLogger.isDebugEnabled()) {
    app.on('pushed_authorization_request.success', initiateAuthorizeSuccess)
    app.on('pushed_authorization_request.error', initiateAuthorizeError)
  }
  if (authorizeLogger.isDebugEnabled()) {
    app.on('interaction.started', interactionStart)
    app.on('interaction.ended', interactionEnd)
    app.on('authorization.accepted', authorizeSuccess)
    app.on('authorization.error', authorizeError)
    app.on('redirect.authorize', redirectAuthorize)
  }
  if (tokenLogger.isDebugEnabled()) {
    app.on('grant.success', grantSuccess)
    app.on('grant.error', grantError)
    app.on('claims.consumed', claimsConsumed)
  }
  if (interactionLogger.isDebugEnabled()) {
    app.on('interaction.login', interactionLogin)
    app.on('interaction.consent', interactionConsent)
  }
  if (loginLogger.isDebugEnabled()) {
    app.on('login', login)
  }
  if (consentLogger.isDebugEnabled()) {
    app.on('consent', consent)
  }
  if (abortLogger.isDebugEnabled()) {
    app.on('abort', abort)
  }
  if (logoutLogger.isDebugEnabled()) {
    app.on('logout', logout)
  }
  app.on('app.error', error)
}

module.exports = {
  registerEventEmitters
}
