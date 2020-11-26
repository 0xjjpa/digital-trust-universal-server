'use strict'

const { resolvers, Users, utils, Connection } = require('@gruposantander/iamid-provider')
const moment = require('moment')
const debug = require('debug')('graphql-resolver')

const {
  ClaimResponse,
  Claim,
  Unresolved: { notFound },
  Resolved,
  proxyResolvers,
  UnauthorizedError
} = resolvers

const { normalizePhoneNumber } = utils
const dateFormat = process.env.DATE_FORMAT || 'DD/MM/YYYY'

const SYSTEM_TYPE = 'GraphQL'

const NOT_FOUND = [notFound()]
const CLAIM_NOT_FOUND = new Claim([], NOT_FOUND)

function claim (value, ial) {
  return new Claim([new Resolved(value, ial)])
}

function claimIfFound (value, ial) {
  if (value === undefined || value === '') {
    return CLAIM_NOT_FOUND
  }
  return claim(value, ial)
}

function claimIfAny (resolved) {
  return new Claim(resolved, resolved.length ? [] : NOT_FOUND)
}

class GraphQLConnector {
  constructor (whitelist, client, repositories) {
    const self = this

    // Initialize the User repository
    this.repo = new Users(repositories)

    /**
     * Helper function to parse the data related with business
     * @param {Object} businessData - JSON object returned by the identifyAPI
     * @param {Object} claims - asked claims
     * @return {Map} - A map with claim name as key and composed Claims object as value.
     */
    function basicDetailsForBusinessParser (businessData, claims) {
      const { company_registered_name: crn, company_trade_name: ctn, company_start_date: csd, company_end_date: ced, company_type: ct, company_country_incorporation: cci, ialBBD } = businessData
      return {
        company_registered_name: claimIfFound(crn, ialBBD),
        company_trade_name: claimIfFound(ctn, ialBBD),
        company_start_date: claimIfFound(moment(csd).format(dateFormat), ialBBD),
        company_end_date: claimIfFound(moment(ced).format(dateFormat), ialBBD),
        company_type: claimIfFound(ct, ialBBD),
        company_country_incorporation: claimIfFound(cci, ialBBD),
        // TODO we should get TimeZone from a environment variable or configuration to calculate this.
        company_age: claimIfFound(csd && moment().diff(moment(csd), 'years'), ialBBD),
        company_operating: (Object.entries(businessData).length > 0) ? claim(!ced || ced.length === 0, ialBBD) : CLAIM_NOT_FOUND
      }
    }

    async function claimsQueryResolver (auth, claims) {
      const response = await client.userClaimsQuery(auth.token.access_token)
      const {
        PersonalBasicDetail = {},
        BusinessBasicDetail = {},
        Addresses = [],
        PhoneNumbers = [],
        Emails = [],
        Finances = [],
        BankAccounts = [],
        IdDocuments = [],
        Proofs = []
      } = response.User

      debug('PersonalBasicDetail')
      const {
        title,
        given_name: givenName,
        family_name: familyName,
        gender,
        birthdate,
        civil_status: civilStatus,
        country_of_birth: countryOfBirth,
        nationality,
        ialPBD
      } = PersonalBasicDetail
      debug('Emails')
      const email = []

      Emails.map(item => {
        email.push(new Resolved(item.value, item.ialEmail))
      })

      debug('PhoneNumbers')
      const phone = []
      PhoneNumbers.map(item => {
        const normalized = normalizePhoneNumber(item.value)
        if (normalized) {
          phone.push(new Resolved(normalized, item.ialPhoneNumber))
        }
      })

      debug('Addresses')
      const address = []
      Addresses.map(item => {
        address.push(new Resolved({
          formatted: item.formatted,
          street_address: item.street_address,
          locality: item.locality,
          region: item.region,
          postal_code: item.postal_code,
          country: item.country
        }, item.ialAddress))
      })

      debug('IdDocuments')
      const nationalCardId = []
      const passportId = []
      const drivingLicenseId = []
      const taxId = []

      IdDocuments.map(item => {
        switch (item.type) {
          case 'national_card': nationalCardId.push(new Resolved(item.identification, item.ialIDDoc)); break
          case 'passport': passportId.push(new Resolved(item.identification, item.ialIDDoc)); break
          case 'driving_license': drivingLicenseId.push(new Resolved(item.identification, item.ialIDDoc)); break
          case 'tax': taxId.push(new Resolved(item.identification, item.ialIDDoc)); break
        }
      })

      debug('BankAccounts')
      const bankAccount = []
      BankAccounts.map(item => {
        const bc = {
          id: item.bankId,
          type: item.type,
          currency: item.currency,
          identifiers: item.BankAccountIdentifiers
        }
        bankAccount.push(new Resolved(bc, item.ialBankAccount))
      })

      debug('Finances')
      const totalBalance = []
      const lastYearMoneyIn = []
      const averageMonthlyMoneyIn = []
      const lastQuarterMoneyIn = []
      Finances.map(item => {
        totalBalance.push(new Resolved({ amount: item.total_balance, currency: item.currency }, item.ialFinance))
        lastYearMoneyIn.push(new Resolved({ amount: item.last_year_money_in, currency: item.currency }, item.ialFinance))
        lastQuarterMoneyIn.push(new Resolved({ amount: item.last_quarter_money_in, currency: item.currency }, item.ialFinance))
        averageMonthlyMoneyIn.push(new Resolved({ amount: item.average_monthly_money_in, currency: item.currency }, item.ialFinance))
      })

      debug('Proofs')
      const proof = []
      Proofs.map(item => {
        proof.push(new Resolved({
          proofId: item.proofId,
          claims: item.claims,
          content_type: item.content_type,
          content: item.content,
          expires: item.expires,
          verified: item.verified
        }, '3'))
      })

      const result = {
        title: claimIfFound(title, ialPBD),
        given_name: claimIfFound(givenName, ialPBD),
        family_name: claimIfFound(familyName, ialPBD),
        gender: claimIfFound(gender, ialPBD),
        birthdate: claimIfFound(moment(birthdate).format(dateFormat), ialPBD),
        age: claimIfFound(birthdate && moment().diff(moment(birthdate), 'years'), ialPBD),
        civil_status: claimIfFound(civilStatus, ialPBD),
        country_of_birth: claimIfFound(countryOfBirth, ialPBD),
        nationality: claimIfFound(nationality, ialPBD),
        phone_number: claimIfAny(phone),
        email: claimIfAny(email),
        address: claimIfAny(address),
        national_card_id: claimIfAny(nationalCardId),
        passport_id: claimIfAny(passportId),
        driving_license_id: claimIfAny(drivingLicenseId),
        tax_id: claimIfAny(taxId),
        bank_account: claimIfAny(bankAccount),
        total_balance: claimIfAny(totalBalance),
        last_year_money_in: claimIfAny(lastYearMoneyIn),
        last_quarter_money_in: claimIfAny(lastQuarterMoneyIn),
        average_monthly_money_in: claimIfAny(averageMonthlyMoneyIn),
        proof: claimIfAny(proof)
      }

      if (BusinessBasicDetail !== null) {
        debug('BusinessBasicDetail')
        const businessDataMap = basicDetailsForBusinessParser(BusinessBasicDetail, claims)
        return new ClaimResponse({ ...result, ...businessDataMap })
      } else {
        return new ClaimResponse({ ...result })
      }
    }

    claimsQueryResolver.claims = {
      email: { ial: 1 },
      phone_number: { ial: 1 },
      given_name: { ial: 1 },
      family_name: { ial: 1 },
      birthdate: { ial: 1 },
      age: { ial: 1 },
      address: { ial: 1 },
      title: { ial: 1 },
      gender: { ial: 1 },
      country_of_birth: { ial: 1 },
      nationality: { ial: 1 },
      civil_status: { ial: 1 },
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
      tax_id: { ial: 1 },
      total_balance: { ial: 1 },
      bank_account: { ial: 1 },
      last_year_money_in: { ial: 1 },
      last_quarter_money_in: { ial: 1 },
      average_monthly_money_in: { ial: 1 },
      proof: { ial: 3 }
    }

    class Authorization {
      constructor (sysUid, token) {
        this.sysUid = sysUid
        this.time = Date.now()
        this.token = token
      }
    }

    const EXPIRES_ERROR_MARGIN = 20 // seconds

    // TODO we should create e test for when no return values this repo...
    async function refreshResolver (uid) {
      const user = await self.repo.get(uid)
      const { auth } = user.getConnection(SYSTEM_TYPE)
      const diff = Number.parseInt(auth.token.expires_in, 10) - (Date.now() - auth.time) / 1000 - EXPIRES_ERROR_MARGIN
      if (diff > 0) {
        return auth
      }
      const token = await client.refresh(auth.token.refresh_token)

      const refreshed = new Authorization(auth.sysUid, token)
      const connection = new Connection(SYSTEM_TYPE, auth.sysUid, refreshed)
      await self.repo.insertOrUpdate(connection)
      return refreshed
    }

    this.login = async (user, pass) => {
      if (!whitelist.isWhitelisted(user)) {
        throw new UnauthorizedError(`user "${user}" is not whitelisted`)
      }
      const sysUid = await client.obtainUid(user)
      const token = await client.token(sysUid, pass)
      const authorization = new Authorization(sysUid, token)
      const connection = new Connection(SYSTEM_TYPE, sysUid, authorization)
      const uid = await self.repo.insertOrUpdate(connection)
      return uid
    }

    const proxy = proxyResolvers(claimsQueryResolver)

    this.resolver = async (uid, claims) => {
      const refreshed = await refreshResolver(uid)
      return proxy(refreshed, claims)
    }

    this.resolver.claims = proxy.claims
  }
}

module.exports = GraphQLConnector
