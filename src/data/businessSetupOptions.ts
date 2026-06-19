import type { CountryCode, CurrencyCode } from '../types'

export const businessTypeSuggestions = [
  'Provision store',
  'Fashion/Clothing',
  'Foodstuff store',
  'Restaurant/Food vendor',
  'Beauty salon',
  'Electronics',
  'Pharmacy',
  'POS agent',
  'Services',
  'Other'
]

export const currencyOptions: Array<{ code: CurrencyCode; label: string }> = [
  { code: 'NGN', label: 'Naira (NGN)' },
  { code: 'USD', label: 'US Dollar (USD)' },
  { code: 'GBP', label: 'Pound Sterling (GBP)' }
]

export const countryOptions: Array<{ code: CountryCode; label: string }> = [
  { code: 'NG', label: 'Nigeria' },
  { code: 'US', label: 'United States' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'OTHER', label: 'Other' }
]

export const regionOptionsByCountry: Record<CountryCode, string[]> = {
  NG: [
    'Abia',
    'Adamawa',
    'Akwa Ibom',
    'Anambra',
    'Bauchi',
    'Bayelsa',
    'Benue',
    'Borno',
    'Cross River',
    'Delta',
    'Ebonyi',
    'Edo',
    'Ekiti',
    'Enugu',
    'Federal Capital Territory',
    'Gombe',
    'Imo',
    'Jigawa',
    'Kaduna',
    'Kano',
    'Katsina',
    'Kebbi',
    'Kogi',
    'Kwara',
    'Lagos',
    'Nasarawa',
    'Niger',
    'Ogun',
    'Ondo',
    'Osun',
    'Oyo',
    'Plateau',
    'Rivers',
    'Sokoto',
    'Taraba',
    'Yobe',
    'Zamfara'
  ],
  US: [
    'Alabama',
    'Alaska',
    'Arizona',
    'Arkansas',
    'California',
    'Colorado',
    'Connecticut',
    'Delaware',
    'District of Columbia',
    'Florida',
    'Georgia',
    'Hawaii',
    'Idaho',
    'Illinois',
    'Indiana',
    'Iowa',
    'Kansas',
    'Kentucky',
    'Louisiana',
    'Maine',
    'Maryland',
    'Massachusetts',
    'Michigan',
    'Minnesota',
    'Mississippi',
    'Missouri',
    'Montana',
    'Nebraska',
    'Nevada',
    'New Hampshire',
    'New Jersey',
    'New Mexico',
    'New York',
    'North Carolina',
    'North Dakota',
    'Ohio',
    'Oklahoma',
    'Oregon',
    'Pennsylvania',
    'Rhode Island',
    'South Carolina',
    'South Dakota',
    'Tennessee',
    'Texas',
    'Utah',
    'Vermont',
    'Virginia',
    'Washington',
    'West Virginia',
    'Wisconsin',
    'Wyoming'
  ],
  GB: ['England', 'Scotland', 'Wales', 'Northern Ireland'],
  OTHER: []
}

export function defaultCurrencyForCountry(country: CountryCode): CurrencyCode {
  if (country === 'US') return 'USD'
  if (country === 'GB') return 'GBP'
  return 'NGN'
}

export function countryLabelFor(code: CountryCode) {
  return countryOptions.find((country) => country.code === code)?.label ?? 'Other'
}

export function buildLocationSummary(address: string, stateRegion: string, country: CountryCode) {
  return [address, stateRegion, countryLabelFor(country)].map((part) => part.trim()).filter(Boolean).join(', ')
}
