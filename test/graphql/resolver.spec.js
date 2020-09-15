'use strict'

const { describe, it, before, after, beforeEach, afterEach } = require('mocha')
const nock = require('nock')
const sinon = require('sinon')
const { ok, deepEqual, rejects } = require('assert').strict

const { resolvers: { Unresolved, ClaimResponse, Claim, Resolved }, Users } = require('@gruposantander/iamid-provider')
const GraphQLConnector = require('../../src/graphql/resolver')
const GraphQLClient = require('../../src/graphql/client')
const PIdWhitelist = require('../../src/pid-whitelist')
const USER_QUERY_200 = require('./resources/user-200')
const CLAIMS_QUERY_200_BUSINESS = require('./resources/claims-200-business')

const CLAIMS_QUERY_200_BUSINESS_OPERATING = require('./resources/claims-200-business-active')
const USER_QUERY_200_NOT_FOUND = require('./resources/user-200-notfound')
const CLAIMS_QUERY_200 = require('./resources/claims-200')
const NOT_FOUND = new Unresolved('not_found')

const WHITELIST_CFG = {
  enabled: false
}

const USER = 'hilton'
const PASS = '1234'

module.exports = function () {
  const BASE = 'http://localhost:3000'

  before('Set up', function () {
    const client = new GraphQLClient()
    const whitelist = new PIdWhitelist(WHITELIST_CFG)
    this.connector = new GraphQLConnector(whitelist, client, this.repositories)
    nock.disableNetConnect()
  })

  afterEach('clear nock', async function () {
    nock.cleanAll()
    const repo = await this.repositories.getRepository(Users.getRepoName())
    repo.clear()
  })

  after('tear down', function () {
    nock.enableNetConnect()
  })

  describe('Login Resolver', function () {
    it('should return a token (userId) if credentials are correct', async function () {
      nock(BASE).post('/').reply(200, USER_QUERY_200)
      const uid = await this.connector.login(USER, PASS)
      ok(uid.length !== 0)
    })

    it('should return an error if credentials are not correct', async function () {
      nock(BASE).post('/').reply(200, USER_QUERY_200_NOT_FOUND)
      await rejects(this.connector.login('NOT A USER', PASS), {
        message: 'Invalid Username or Password.'
      })
    })
  })

  describe('Claims Resolver', function () {
    beforeEach('login', async function () {
      nock(BASE).post('/').reply(200, USER_QUERY_200)
      this.uid = await this.connector.login(USER, PASS)
      nock(BASE).post('/').reply(200, CLAIMS_QUERY_200)
    })

    it('should expose all the claims that process', function () {
      deepEqual(
        this.connector.resolver.claims,
        {
          age: { ial: 1 },
          address: { ial: 1 },
          birthdate: { ial: 1 },
          email: { ial: 1 },
          family_name: { ial: 1 },
          given_name: { ial: 1 },
          phone_number: { ial: 1 },
          total_balance: { ial: 1 },
          title: { ial: 1 },
          gender: { ial: 1 },
          country_of_birth: { ial: 1 },
          nationality: { ial: 1 },
          civil_status: { ial: 1 },
          last_year_money_in: { ial: 1 },
          last_quarter_money_in: { ial: 1 },
          average_monthly_money_in: { ial: 1 },
          company_registered_name: { ial: 1 },
          company_trade_name: { ial: 1 },
          company_start_date: { ial: 1 },
          company_end_date: { ial: 1 },
          company_type: { ial: 1 },
          company_country_incorporation: { ial: 1 },
          company_age: { ial: 1 },
          company_operating: { ial: 1 },
          national_card_id: { ial: 1 },
          passport_id: { ial: 1 },
          driving_license_id: { ial: 1 },
          bank_account: { ial: 1 }
        }
      )
    })

    it('should resolve total_balance and given_name', async function () {
      const claims = await this.connector.resolver(this.uid, {
        email: { ials: [1] },
        given_name: { ials: [1] },
        phone_number: { ials: [1] },
        family_name: { ials: [1] },
        birthdate: { ials: [1] },
        total_balance: { ials: [1] }
      })
      deepEqual(claims, new ClaimResponse({
        total_balance: new Claim([new Resolved({ amount: '5000.00', currency: 'GBP' }, '3'), new Resolved({ amount: '25000.00', currency: 'EUR' }, '3')]),
        given_name: new Claim([new Resolved('Yost', '2')]),
        family_name: new Claim([new Resolved('Hilton', '2')]),
        phone_number: new Claim([new Resolved('+44000000000', '2'), new Resolved('+44000000001', '1')]),
        birthdate: new Claim([new Resolved('22/05/1985', '2')]),
        email: new Claim([new Resolved('hilton@exampleop.com', '2'), new Resolved('hilton22@exampleop2.com', '1')])
      }))
    })

    it('should resolve national_card_id, passport_id, and driving_license_id if available', async function () {
      const claims = await this.connector.resolver(this.uid, {
        national_card_id: { ials: [1] },
        passport_id: { ials: [1] },
        driving_license_id: { ials: [1] }
      })
      deepEqual(claims, new ClaimResponse({
        national_card_id: new Claim([new Resolved('331123123121R', '3')]),
        passport_id: new Claim([new Resolved('SQ8RN5LX1', '3')]),
        driving_license_id: new Claim([new Resolved('HILT131123131206', '2')])
      }))
    })

    it('should resolve total_balance, last_year_money_in, last_quarter_money_in and average_monthly_money_in if available', async function () {
      const claims = await this.connector.resolver(this.uid, {
        total_balance: { ials: [1] },
        last_year_money_in: { ials: [1] },
        last_quarter_money_in: { ials: [1] },
        average_monthly_money_in: { ials: [1] }
      })
      deepEqual(claims, new ClaimResponse({
        total_balance: new Claim([new Resolved({ amount: '5000.00', currency: 'GBP' }, '3'), new Resolved({ amount: '25000.00', currency: 'EUR' }, '3')]),
        last_year_money_in: new Claim([new Resolved({ amount: '40000.00', currency: 'GBP' }, '3'), new Resolved({ amount: '8000.00', currency: 'EUR' }, '3')]),
        last_quarter_money_in: new Claim([new Resolved({ amount: '9000.00', currency: 'GBP' }, '3'), new Resolved({ amount: '3000.00', currency: 'EUR' }, '3')]),
        average_monthly_money_in: new Claim([new Resolved({ amount: '3000.00', currency: 'GBP' }, '3'), new Resolved({ amount: '500.00', currency: 'EUR' }, '3')])
      }))
    })

    it('should resolve bank_account', async function () {
      const claims = await this.connector.resolver(this.uid, {
        bank_account: { ials: [1] }
      })
      deepEqual(claims, new ClaimResponse({
        bank_account: new Claim([new Resolved({
          id: '09012700047186',
          currency: 'GBP',
          type: 'Personal',
          identifiers: [
            {
              type: 'UK.SortCodeAccountNumber',
              identification: '09012700047186'
            },
            {
              type: 'IBAN',
              identification: 'UK002209209012700047186'
            }
          ]
        }, '3'),
        new Resolved({
          id: '09012700055123',
          currency: 'EUR',
          type: 'Personal',
          identifiers: [
            {
              type: 'UK.SortCodeAccountNumber',
              identification: '09012700055123'
            }
          ]
        }, '3')])
      }))
    })

    it('should resolve address claims', async function () {
      const claims = await this.connector.resolver(this.uid, {
        address: { ials: [1] }
      })
      deepEqual(claims, new ClaimResponse({
        address: new Claim([
          new Resolved({ country: 'United Kingdom', formatted: '19 Kacey Forest, Redding, QZBAD9, United Kingdom', locality: 'Redding', postal_code: 'QZBAD9', street_address: '19 Kacey Forest', region: '' }, '2'),
          new Resolved({ country: 'United Kingdom', formatted: '33 Mountain, Lockhill, LH1AB8, United Kingdom', locality: 'Lockhill', postal_code: 'LH1AB8', street_address: '33 Mountain', region: '' }, '1')
        ])
      }))
    })

    it('should not fail if it does not understand a claim', async function () {
      const claims = await this.connector.resolver(this.uid, { given_name: { ials: [1] }, banana_token: {} })
      deepEqual(claims, new ClaimResponse({ given_name: new Claim([new Resolved('Yost', '2')]), banana_token: new Claim([], [NOT_FOUND]) }))
    })
  })

  describe('Basic Details for Business Claims', function () {
    before('set up fake timers', function () {
      // Start as '2019-09-10T21:45:10.278+01:00'
      this.clock = sinon.useFakeTimers(1568148310278)
    })

    after('restore fake timers', function () {
      this.clock.restore()
    })

    beforeEach('login', async function () {
      nock(BASE).post('/').reply(200, USER_QUERY_200)
      this.uid = await this.connector.login(USER, PASS)
    })

    it('should return business claims correctly', async function () {
      nock(BASE).post('/').reply(200, CLAIMS_QUERY_200_BUSINESS)
      const claims = await this.connector.resolver(this.uid, {
        company_registered_name: { ials: [1] },
        company_trade_name: { ials: [1] },
        company_start_date: { ials: [1] },
        company_end_date: { ials: [1] },
        company_type: { ials: [1] },
        company_country_incorporation: { ials: [1] },
        company_age: { ials: [1] },
        company_operating: { ials: [1] }
      })
      deepEqual(claims, new ClaimResponse({
        company_registered_name: new Claim([new Resolved('Zool Ltd', '3')]),
        company_trade_name: new Claim([new Resolved('Zool Ltd', '3')]),
        company_start_date: new Claim([new Resolved('19/01/2015', '3')]),
        company_end_date: new Claim([new Resolved('19/01/2018', '3')]),
        company_type: new Claim([new Resolved('Sole Trader', '3')]),
        company_country_incorporation: new Claim([new Resolved('GB', '3')]),
        company_age: new Claim([new Resolved(4, '3')]),
        company_operating: new Claim([new Resolved(false, '3')])
      }))
    })

    // it.only('should work when no business claims', async function () {
    //   nock(BASE).post('/').reply(200, CLAIMS_QUERY_200)
    //   const claims = await this.connector.resolver(this.uid, {
    //     company_registered_name: { ials: [1] },
    //     company_trade_name: { ials: [1] },
    //     company_start_date: { ials: [1] },
    //     company_end_date: { ials: [1] },
    //     company_type: { ials: [1] },
    //     company_country_incorporation: { ials: [1] },
    //     company_age: { ials: [1] },
    //     company_operating: { ials: [1] }
    //   })
    //   deepEqual(claims, new ClaimResponse({
    //     company_registered_name: new Claim([], [NOT_FOUND]),
    //     company_trade_name: new Claim([], [NOT_FOUND]),
    //     company_start_date: new Claim([], [NOT_FOUND]),
    //     company_end_date: new Claim([], [NOT_FOUND]),
    //     company_type: new Claim([], [NOT_FOUND]),
    //     company_country_incorporation: new Claim([], [NOT_FOUND]),
    //     company_age: new Claim([], [NOT_FOUND]),
    //     company_operating: new Claim([], [NOT_FOUND])
    //   }))
    // })

    it('should return "company_operating" false when undefined endDate', async function () {
      nock(BASE).post('/').reply(200, CLAIMS_QUERY_200_BUSINESS_OPERATING)
      const claims = await this.connector.resolver(this.uid, {
        company_operating: { ials: [1] }
      })
      deepEqual(claims, new ClaimResponse({
        company_operating: new Claim([new Resolved(true, '3')])
      }))
    })
  })
}
