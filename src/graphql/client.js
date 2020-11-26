'use strict'
const { request, gql } = require('graphql-request')
const debug = require('debug')('graphql-client')
const { resolvers: { UnauthorizedError } } = require('@gruposantander/iamid-provider')

class GraphQLClient {
  constructor (options) {
    const {
      baseURL = process.env.CLIENT_BASE_URL || 'http://localhost:3000'
    } = { ...options }

    const ENDPOINT = baseURL

    this.userClaimsQuery = async function (token) {
      const queryClaims = gql`
            {
                User(id:${token}){
            
                    username
                    PersonalBasicDetail {
                        title
                        given_name
                        family_name
                        gender
                        birthdate
                        civil_status
                        country_of_birth
                        nationality
                        ialPBD: ial
                    }
                    BusinessBasicDetail {
                        company_registered_name
                        company_trade_name
                        company_start_date
                        company_end_date
                        company_type
                        company_country_incorporation
                        ialBBD: ial
                    }
                    Addresses {
                        formatted
                        street_address
                        locality
                        region
                        postal_code
                        country
                        ialAddress:ial
                    }
                    PhoneNumbers {
                        value
                        ialPhoneNumber: ial
                    }
                    Emails{
                        value
                        ialEmail: ial
                    }
                    Finances {
                        currency
                        total_balance
                        last_year_money_in
                        last_quarter_money_in
                        average_monthly_money_in
                        ialFinance: ial
                    }
                    BankAccounts {
                        type
                        bankId
                        entity
                        product
                        country
                        currency
                        ialBankAccount: ial
                        BankAccountIdentifiers {
                            type
                            identification
                        }
                    }
                    IdDocuments {
                        type
                        issuer_country
                        identification
                        ialIDDoc: ial
                    },
                  Proofs {
                    claims
                    content
                    content_type
                    expires
                    verified
                  }
                }
            }
        `
      debug(`Sending graphql query to ${ENDPOINT}`)
      const data = await request(ENDPOINT, queryClaims)
      debug(JSON.stringify(data, undefined, 2))
      return data
    }

    this.obtainUid = async function (personalId) {
      const queryUser = gql`
        {
            allUsers(filter: {username:"${personalId}"}){
                id
                }
        }
        `
      debug(`Sending graphql query to ${ENDPOINT}`)
      const data = await request(ENDPOINT, queryUser)
      debug(JSON.stringify(data, undefined, 2))
      if (data.allUsers.length > 0) {
        const userId = data.allUsers[0].id
        if (!userId) {
          throw new UnauthorizedError('Invalid Username or Password.')
        }
        return userId
      } else {
        throw new UnauthorizedError('Invalid Username or Password.')
      }
    }

    this.token = async function (username, password) {
      return {
        access_token: username,
        refresh_token: username,
        scope: 'basicData business finance contact government',
        token_type: 'Bearer',
        expires_in: '3600'
      }
    }

    this.refresh = async function (refreshToken) {
      debug('refresh_token: %s', refreshToken)
      return {
        access_token: refreshToken,
        refresh_token: refreshToken,
        scope: 'basicData business finance contact government',
        token_type: 'Bearer',
        expires_in: '3600'
      }
    }
    debug(`Backend client pointing to: ${baseURL}`)
  }
}

module.exports = GraphQLClient
