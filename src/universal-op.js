'use strict'

const { IAmId, Configuration, Repositories } = require('@gruposantander/iamid-provider')
const { registerEventEmitters } = require('./event-logger')
const InteractionRouter = require('./interaction-router')
const PIdWhitelist = require('./pid-whitelist')
const GraphQLConnector = require('./graphql/resolver')
const GraphQLClient = require('./graphql/client')

// Config load
const secrets = require('../config/secrets')
const environment = require('../config/environment')
const defaultEnvConfig = require('./default-env-config')
const config = Configuration
  .newInstance()
  .pushSecrets(secrets)
  .pushEnvironment(defaultEnvConfig)
  .pushEnvironment(environment)
  .build()

const repositories = new Repositories(config.repositories)
const client = new GraphQLClient()
const whitelist = new PIdWhitelist(config.pid_whitelist)
const connector = new GraphQLConnector(whitelist, client, repositories)
const { login, resolver } = connector
const router = new InteractionRouter(login)
const app = new IAmId(config, router, repositories, resolver)

// Initialize connector with repositories
registerEventEmitters(app)
module.exports = { app, repositories }
