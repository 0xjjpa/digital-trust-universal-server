'use strict'

const assert = require('assert')
const { equal, ok, deepEqual } = assert.strict
const { it } = require('mocha')
const {
  jwtVerify, OP_ID, CLIENT_ID, CLIENT, REDIRECT_URI, DEFAULT_REQUEST_OBJECT,
  INTERACTION_PATH, CONSENT_PATH, getInteractionIdFromInteractionUri
} = require('./fixtures')
const { resolvers: { ClaimResponse, Claim, Resolved } } = require('@gruposantander/iamid-provider')

module.exports = function () {
  it('should complete a happy path', async function () {
    const agent = this.agent()
    const requestObject = {
      ...DEFAULT_REQUEST_OBJECT,
      ...{
        claims: {
          purpose: 'general purpose',
          id_token: {
            given_name: { essential: true, purpose: 'id_token given_name purpose' },
            total_balance: { essential: true, purpose: 'id_token total_balance purpose' },
            age: { essential: true, purpose: 'id_token age purpose' },
            gender: { essential: true, purpose: 'id_token gender purpose' },
            country_of_birth: { ial: 2, essential: true, purpose: 'id_token country_of_birth purpose' },
            nationality: { essential: true, purpose: 'id_token nationality purpose' },
            last_year_money_in: { essential: true, purpose: 'id_token last_year_money_in purpose' },
            last_quarter_money_in: { essential: true, purpose: 'id_token last_quarter_money_in purpose' },
            company_registered_name: { essential: true, purpose: 'id_token company_registered_name purpose' },
            company_trade_name: { essential: true, purpose: 'id_token company_trade_name purpose' },
            company_start_date: { essential: true, purpose: 'id_token company_start_date purpose' },
            company_end_date: { essential: true, purpose: 'id_token company_end_date purpose' },
            national_card_id: { essential: true, purpose: 'id_token national_card_id purpose' },
            passport_id: { essential: true, purpose: 'id_token passport_id purpose' }
          },
          userinfo: {
            family_name: { purpose: 'userinfo family_name purpose' },
            given_name: { essential: true, purpose: 'userinfo given_name purpose' },
            total_balance: { essential: true, purpose: 'userinfo total_balance purpose' },
            email: { essential: true, purpose: 'userinfo email purpose' },
            phone_number: { essential: true, purpose: 'userinfo phone_number purpose' },
            birthdate: { essential: true, purpose: 'userinfo birthdate purpose' },
            custard_apple: { essential: true, purpose: 'userinfo custard_apple purpose' },
            age: { essential: false, purpose: 'userinfo age purpose' },
            title: { essential: false, purpose: 'userinfo title purpose' },
            civil_status: { essential: false, purpose: 'userinfo civil_status purpose' },
            average_monthly_money_in: { essential: true, purpose: 'userinfo average_monthly_money_in purpose' },
            company_type: { essential: true, purpose: 'userinfo company_type purpose' },
            company_country_incorporation: { essential: true, purpose: 'userinfo company_country_incorporation purpose' },
            company_age: { essential: true, purpose: 'userinfo company_age purpose' },
            company_operating: { essential: true, purpose: 'userinfo company_operating purpose' },
            driving_license_id: { essential: true, purpose: 'userinfo driving_license_id purpose' }
          }
        }
      }
    }

    const interactionUri = await this.goToInteraction(agent, { requestObject })
    const interactionId = getInteractionIdFromInteractionUri(interactionUri)
    await agent.get(interactionUri)
      .expect(200, {
        interaction: 'login',
        acr: 'any',
        interaction_id: interactionId,
        redirect_uri: 'http://127.0.0.1:8080/cb',
        interaction_path: `/interaction/${interactionId}/login`
      })

    const { header: { location: interactionUri2 } } = await this.login(agent, interactionId)
      .expect(({ header: { location } }) => {
        assert(location.startsWith('/interaction'))
      })

    const claims = {
      given_name: new Claim([new Resolved('Juan José', 1)]),
      family_name: new Claim([new Resolved('Ramírez Escribano', 1)]),
      total_balance: new Claim([new Resolved({ amount: '10.23', currency: 'GBP' }, 1)]),
      birthdate: new Claim([new Resolved('2000-01-10', 1)]),
      age: new Claim([new Resolved(54, 2)]),
      email: new Claim([new Resolved('custard.apple@santander.co.uk', 1)]),
      phone_number: new Claim([new Resolved('1234567890', 1), new Resolved('9456787767', 1)]),
      title: new Claim([new Resolved('Mr', 1)]),
      civil_status: new Claim([new Resolved('MARRIED', 1)]),
      gender: new Claim([new Resolved('MALE', 1)]),
      country_of_birth: new Claim([new Resolved('GB', 2)]),
      nationality: new Claim([new Resolved('GB', 1)]),
      last_year_money_in: new Claim([new Resolved({ amount: '100000.22', currency: 'GBP' }, 1)]),
      last_quarter_money_in: new Claim([new Resolved({ amount: '23000.23', currency: 'GBP' }, 1)]),
      average_monthly_money_in: new Claim([new Resolved({ amount: '10000.24', currency: 'GBP' }, 1)]),
      company_registered_name: new Claim([new Resolved('BRITISH AIRWAYS PLC', 2)]),
      company_trade_name: new Claim([new Resolved('COCA COLA COMPANY', 2)]),
      company_start_date: new Claim([new Resolved('2000-01-01', 2)]),
      company_end_date: new Claim([new Resolved('2015-01-06', 2)]),
      company_type: new Claim([new Resolved('CHARITY', 2)]),
      company_country_incorporation: new Claim([new Resolved('ES', 2)]),
      company_age: new Claim([new Resolved(19, 2)]),
      company_operating: new Claim([new Resolved(false, 2)]),
      national_card_id: new Claim([new Resolved('121212121212', 2)]),
      passport_id: new Claim([new Resolved('131313131313', 2)]),
      driving_license_id: new Claim([new Resolved('SCOT1414141414', 2)])
    }
    const resolvedClaims = new ClaimResponse(claims)

    const { body: { interaction_id: interactionId2 } } = await this.secondInteraction(agent, interactionUri2, { resolvedClaims }).expect({
      client: CLIENT,
      claims: {
        purpose: 'general purpose',
        id_token: {
          assertion_claims: {},
          given_name: { ial: 1, essential: true, purpose: 'id_token given_name purpose', result: ['Ju****sé'], unresolved: [] },
          total_balance: { ial: 1, essential: true, purpose: 'id_token total_balance purpose', result: [{ amount: '10.23', currency: 'GBP' }], unresolved: [] },
          age: { ial: 1, essential: true, purpose: 'id_token age purpose', result: [54], unresolved: [] },
          gender: { ial: 1, essential: true, purpose: 'id_token gender purpose', result: ['MALE'], unresolved: [] },
          country_of_birth: { ial: 2, essential: true, purpose: 'id_token country_of_birth purpose', result: ['GB'], unresolved: [] },
          nationality: { ial: 1, essential: true, purpose: 'id_token nationality purpose', result: ['GB'], unresolved: [] },
          last_year_money_in: { ial: 1, essential: true, purpose: 'id_token last_year_money_in purpose', result: [{ amount: '100000.22', currency: 'GBP' }], unresolved: [] },
          last_quarter_money_in: { ial: 1, essential: true, purpose: 'id_token last_quarter_money_in purpose', result: [{ amount: '23000.23', currency: 'GBP' }], unresolved: [] },
          company_registered_name: { ial: 1, essential: true, purpose: 'id_token company_registered_name purpose', result: ['BRITISH AIRWAYS PLC'], unresolved: [] },
          company_trade_name: { ial: 1, essential: true, purpose: 'id_token company_trade_name purpose', result: ['COCA COLA COMPANY'], unresolved: [] },
          company_start_date: { ial: 1, essential: true, purpose: 'id_token company_start_date purpose', result: ['2000-01-01'], unresolved: [] },
          company_end_date: { ial: 1, essential: true, purpose: 'id_token company_end_date purpose', result: ['2015-01-06'], unresolved: [] },
          national_card_id: { ial: 1, essential: true, purpose: 'id_token national_card_id purpose', result: ['*****1212'], unresolved: [] },
          passport_id: { ial: 1, essential: true, purpose: 'id_token passport_id purpose', result: ['******1313'], unresolved: [] }
        },
        userinfo: {
          assertion_claims: {},
          family_name: { ial: 1, purpose: 'userinfo family_name purpose', result: ['Ra****no'], unresolved: [] },
          given_name: { ial: 1, essential: true, purpose: 'userinfo given_name purpose', result: ['Ju****sé'], unresolved: [] },
          total_balance: { ial: 1, essential: true, purpose: 'userinfo total_balance purpose', result: [{ amount: '10.23', currency: 'GBP' }], unresolved: [] },
          email: { ial: 1, essential: true, purpose: 'userinfo email purpose', result: ['c****e@santander.co.uk'], unresolved: [] },
          phone_number: { ial: 1, essential: true, purpose: 'userinfo phone_number purpose', result: ['******7890', '******7767'], unresolved: [] },
          birthdate: { ial: 1, essential: true, purpose: 'userinfo birthdate purpose', result: ['2000-01-10'], unresolved: [] },
          age: { ial: 1, essential: false, purpose: 'userinfo age purpose', result: [54], unresolved: [] },
          title: { ial: 1, essential: false, purpose: 'userinfo title purpose', result: ['Mr'], unresolved: [] },
          civil_status: { ial: 1, essential: false, purpose: 'userinfo civil_status purpose', result: ['MARRIED'], unresolved: [] },
          average_monthly_money_in: { ial: 1, essential: true, purpose: 'userinfo average_monthly_money_in purpose', result: [{ amount: '10000.24', currency: 'GBP' }], unresolved: [] },
          company_type: { ial: 1, essential: true, purpose: 'userinfo company_type purpose', result: ['CHARITY'], unresolved: [] },
          company_country_incorporation: { ial: 1, essential: true, purpose: 'userinfo company_country_incorporation purpose', result: ['ES'], unresolved: [] },
          company_age: { ial: 1, essential: true, purpose: 'userinfo company_age purpose', result: [19], unresolved: [] },
          company_operating: { ial: 1, essential: true, purpose: 'userinfo company_operating purpose', result: [false], unresolved: [] },
          driving_license_id: { ial: 1, essential: true, purpose: 'userinfo driving_license_id purpose', result: ['SCOT************14'], unresolved: [] }
        }
      },
      interaction: 'consent',
      scopes: ['openid'],
      interaction_id: interactionId,
      redirect_uri: 'http://127.0.0.1:8080/cb',
      interaction_path: `/interaction/${interactionId}/consent`
    })

    const { header: { location } } = await agent
      .post(INTERACTION_PATH + interactionId2 + CONSENT_PATH)
      .send({
        id_token: {
          claims: {
            given_name: 0,
            total_balance: 0,
            gender: 0,
            country_of_birth: 0,
            nationality: 0,
            last_year_money_in: 0,
            last_quarter_money_in: 0,
            company_registered_name: 0,
            company_trade_name: 0,
            company_start_date: 0,
            company_end_date: 0,
            national_card_id: 0,
            passport_id: 0
          }
        },
        userinfo: {
          claims: {
            family_name: 0,
            total_balance: 0,
            email: 0,
            phone_number: 0,
            birthdate: 0,
            age: 0,
            title: 0,
            civil_status: 0,
            average_monthly_money_in: 0,
            company_type: 0,
            company_country_incorporation: 0,
            company_age: 0,
            company_operating: 0,
            driving_license_id: 0
          }
        },
        approved_scopes: ['openid']
      })
      .expect(302)
    assert(location.startsWith(REDIRECT_URI))

    const code = new URL(location).searchParams.get('code')
    const {
      body: {
        scope, token_type: tokenType,
        id_token: idTokenStr,
        access_token: accessToken
      }
    } = await this.token(agent, code)

    equal(scope, 'openid')
    equal(tokenType, 'Bearer')

    const idToken = jwtVerify(idTokenStr)

    equal(idToken.iss, OP_ID)
    equal(idToken.aud, CLIENT_ID)
    deepEqual(idToken.given_name, claims.given_name.resolved[0].value)
    deepEqual(idToken.total_balance, claims.total_balance.resolved[0].value)
    deepEqual(idToken.gender, 'MALE')
    deepEqual(idToken.country_of_birth, 'GB')
    deepEqual(idToken.nationality, 'GB')
    deepEqual(idToken.last_year_money_in, { amount: '100000.22', currency: 'GBP' })
    deepEqual(idToken.last_quarter_money_in, { amount: '23000.23', currency: 'GBP' })
    ok(idToken.txn)
    deepEqual(idToken.company_registered_name, 'BRITISH AIRWAYS PLC')
    deepEqual(idToken.company_trade_name, 'COCA COLA COMPANY')
    deepEqual(idToken.company_start_date, '2000-01-01')
    deepEqual(idToken.company_end_date, '2015-01-06')
    deepEqual(idToken.national_card_id, '121212121212')
    deepEqual(idToken.passport_id, '131313131313')

    await agent.get('/me')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200, {
        sub: 'e3def28859bc43cad610082f60d663e431f73d1c7a26fc06d8c67ab730978e6f',
        txn: idToken.txn,
        family_name: claims.family_name.resolved[0].value,
        total_balance: claims.total_balance.resolved[0].value,
        email: claims.email.resolved[0].value,
        phone_number: claims.phone_number.resolved[0].value,
        birthdate: claims.birthdate.resolved[0].value,
        age: 54,
        title: 'Mr',
        civil_status: 'MARRIED',
        average_monthly_money_in: { amount: '10000.24', currency: 'GBP' },
        company_age: 19,
        company_country_incorporation: 'ES',
        company_operating: false,
        company_type: 'CHARITY',
        driving_license_id: 'SCOT1414141414'
      })
  })

  it('should allow execute the flow two times in same agent (cookies)', async function () {
    const agent = this.agent()
    const code = await this.goToToken(agent)
    await this.token(agent, code)

    const requestObject = { nonce: 'other-nonce', ...DEFAULT_REQUEST_OBJECT }
    const { body } = await this.initiateAuthorize(agent, { requestObject })

    await this.authorize(agent, body.request_uri)
      .expect(302)
      .expect(({ header, body }) => {
        assert(header.location.startsWith('/interaction/'), 'Redirection to /interaction endpoint')
      })
  })

  it('should complete a happy path (assertions)', async function () {
    const agent = this.agent()
    const requestObject = {
      ...DEFAULT_REQUEST_OBJECT,
      ...{
        claims: {
          purpose: 'general purpose',
          id_token: {
            given_name: { essential: true, purpose: 'id_token given_name purpose' },
            assertion_claims: {
              title: { assertion: { eq: 'Mr' } },
              nationality: { assertion: { eq: 'ES' } }
            }
          },
          userinfo: {
            family_name: { purpose: 'userinfo family_name purpose' },
            assertion_claims: {
              civil_status: { assertion: { eq: 'MARRIED' } },
              gender: { assertion: { eq: 'FEMALE' } },
              country_of_birth: { assertion: { eq: 'ES' } }
            }
          }
        }
      }
    }

    const interactionUri = await this.goToInteraction(agent, { requestObject })
    const interactionId = getInteractionIdFromInteractionUri(interactionUri)
    await agent.get(interactionUri)
      .expect(200, {
        interaction: 'login',
        acr: 'any',
        interaction_id: interactionId,
        redirect_uri: 'http://127.0.0.1:8080/cb',
        interaction_path: `/interaction/${interactionId}/login`
      })

    const { header: { location: interactionUri2 } } = await this.login(agent, interactionId)

    const claims = {
      given_name: new Claim([new Resolved('Juan José', 1)]),
      family_name: new Claim([new Resolved('Ramírez Escribano', 1)]),
      title: new Claim([new Resolved('Mr', 1)]),
      civil_status: new Claim([new Resolved('MARRIED', 1)]),
      gender: new Claim([new Resolved('FEMALE', 1)]),
      country_of_birth: new Claim([new Resolved('GB', 2)]),
      nationality: new Claim([new Resolved('GB', 1)])
    }
    const resolvedClaims = new ClaimResponse(claims)

    const { body: { interaction_id: interactionId2 } } = await this.secondInteraction(agent, interactionUri2, { resolvedClaims }).expect({
      client: CLIENT,
      claims: {
        purpose: 'general purpose',
        id_token: {
          assertion_claims: {
            nationality: { assertion: { eq: 'ES' }, ial: 1, match: false, result: [], unresolved: [] },
            title: { assertion: { eq: 'Mr' }, ial: 1, match: true, result: ['Mr'], unresolved: [] }
          },
          given_name: { ial: 1, essential: true, purpose: 'id_token given_name purpose', result: ['Ju****sé'], unresolved: [] }
        },
        userinfo: {
          assertion_claims: {
            civil_status: { assertion: { eq: 'MARRIED' }, ial: 1, match: true, result: ['MARRIED'], unresolved: [] },
            gender: { assertion: { eq: 'FEMALE' }, ial: 1, match: true, result: ['FEMALE'], unresolved: [] },
            country_of_birth: { assertion: { eq: 'ES' }, ial: 1, match: false, result: [], unresolved: [] }
          },
          family_name: { ial: 1, purpose: 'userinfo family_name purpose', result: ['Ra****no'], unresolved: [] }
        }
      },
      interaction: 'consent',
      scopes: ['openid'],
      interaction_id: interactionId,
      redirect_uri: 'http://127.0.0.1:8080/cb',
      interaction_path: `/interaction/${interactionId}/consent`
    })

    const { header: { location } } = await agent
      .post(INTERACTION_PATH + interactionId2 + CONSENT_PATH)
      .send({
        id_token: {
          claims: {
            given_name: 0
          },
          assertions: {
            title: 0,
            nationality: 0
          }
        },
        userinfo: {
          claims: {
            family_name: 0
          },
          assertions: {
            civil_status: 0,
            gender: 0,
            country_of_birth: 0
          }
        },
        approved_scopes: ['openid']
      })
      .expect(302)
    assert(location.startsWith(REDIRECT_URI))

    const code = new URL(location).searchParams.get('code')
    const {
      body: {
        scope, token_type: tokenType,
        id_token: idTokenStr,
        access_token: accessToken
      }
    } = await this.token(agent, code)

    equal(scope, 'openid')
    equal(tokenType, 'Bearer')

    const idToken = jwtVerify(idTokenStr)

    equal(idToken.iss, OP_ID)
    equal(idToken.aud, CLIENT_ID)
    deepEqual(idToken.given_name, claims.given_name.resolved[0].value)
    deepEqual(idToken.assertion_claims.title.result, true)
    deepEqual(idToken.assertion_claims.nationality.result, false)
    ok(idToken.txn)

    await agent.get('/me')
      .set('Authorization', 'Bearer ' + accessToken)
      .expect(200, {
        sub: 'e3def28859bc43cad610082f60d663e431f73d1c7a26fc06d8c67ab730978e6f',
        family_name: claims.family_name.resolved[0].value,
        txn: idToken.txn,
        assertion_claims: {
          civil_status: { result: true },
          gender: { result: true },
          country_of_birth: { result: false }
        }
      })
  })
}
