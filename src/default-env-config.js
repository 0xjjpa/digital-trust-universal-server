'use strict'

module.exports = {
  scopes: ['openid'],
  postLogoutRedirectURI: 'https://www.santander.co.uk',
  customAuthorizationEndpoint: 'https://verifiedid-nginx-spa-verifiedid-pro.e4ff.pro-eu-west-1.openshiftapps.com',
  discovery: {
    claims_in_assertion_claims_supported: {
      total_balance: { type: 'object', props: { amount: { type: 'decimal' }, currency: { type: 'string' } } },
      phone_number: { type: 'phone_number' },
      email: { type: 'string' },
      birthdate: { type: 'date' },
      family_name: { type: 'string' },
      given_name: { type: 'string' },
      age: { type: 'number' },
      address: { type: 'object', props: { formatted: { type: 'string' }, street_address: { type: 'string' }, locality: { type: 'string' }, region: { type: 'string' }, postal_code: { type: 'string' }, country: { type: 'string' } } },
      gender: { type: 'string' },
      country_of_birth: { type: 'string' },
      title: { type: 'string' },
      nationality: { type: 'string' },
      civil_status: { type: 'string' },
      last_year_money_in: { type: 'object', props: { amount: { type: 'decimal' }, currency: { type: 'string' } } },
      last_quarter_money_in: { type: 'object', props: { amount: { type: 'decimal' }, currency: { type: 'string' } } },
      average_monthly_money_in: { type: 'object', props: { amount: { type: 'decimal' }, currency: { type: 'string' } } },
      company_registered_name: { type: 'string' },
      company_trade_name: { type: 'string' },
      company_start_date: { type: 'date' },
      company_end_date: { type: 'date' },
      company_type: { type: 'string' },
      company_country_incorporation: { type: 'string' },
      company_age: { type: 'number' },
      company_operating: { type: 'boolean' },
      national_card_id: { type: 'string' },
      tax_id: { type: 'string' },
      passport_id: { type: 'string' },
      driving_license_id: { type: 'string' },
      bank_account: { type: 'object', props: { id: { type: 'string' }, currency: { type: 'string' }, type: { type: 'string' }, identifiers: { type: 'array', items: { type: 'object', props: { type: { type: 'string' }, identification: { type: 'string' } } } } } },
      proof: { type: 'object', props: { id: { type: 'string' }, claims: { type: 'array', items: { type: 'string' } }, content: { type: 'object' }, content_type: { type: 'string' }, expires: { type: 'date' }, verified: { type: 'date' } } }
    }
  },
  claims: {
    assertion_claims: null,
    total_balance: null,
    phone_number: null,
    email: null,
    birthdate: null,
    family_name: null,
    given_name: null,
    age: null,
    address: null,
    gender: null,
    country_of_birth: null,
    title: null,
    nationality: null,
    civil_status: null,
    last_year_money_in: null,
    average_monthly_money_in: null,
    last_quarter_money_in: null,
    company_registered_name: null,
    company_trade_name: null,
    company_start_date: null,
    company_end_date: null,
    company_type: null,
    company_country_incorporation: null,
    company_age: null,
    company_operating: null,
    national_card_id: null,
    passport_id: null,
    driving_license_id: null,
    tax_id: null,
    bank_account: null,
    proof: null
  },
  masks: {
    email: { type: 'email' },
    phone_number: { type: 'slice', args: { prefix: '******', begin: -4 } },
    given_name: { type: 'fill', args: { begin: 2, end: -2, filling: '****' } },
    family_name: { type: 'fill', args: { begin: 2, end: -2, filling: '****' } },
    passport_id: { type: 'slice', args: { prefix: '******', begin: -4 } },
    driving_license_id: { type: 'fill', args: { begin: 4, end: -2, filling: '************' } },
    national_card_id: { type: 'slice', args: { prefix: '*****', begin: -4 } },
    tax_id: { type: 'slice', args: { prefix: '******', begin: -4 } }
  },
  pushedRequestURN: 'urn:op.example:',
  issuer: 'https://op.example.com'
}
