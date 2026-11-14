const { HttpError, text } = require('./domain.cjs');
const { names } = require('../src/constants/lipa-barangays.json');
const key = value => text(value).toLowerCase().replace(/\s+/g, ' ');
/** Validate only an explicitly supplied municipality; legacy callers retain their existing contract. */
function registrationAddress(input) {
  if (input.cityMunicipality !== undefined && (typeof input.cityMunicipality !== 'string' || input.cityMunicipality.length > 200)) throw new HttpError(400, 'Enter a valid city or municipality.');
  const city = text(input.cityMunicipality);
  let barangay = text(input.barangay);
  let address = text(input.address);
  if (city && (!barangay || !address)) throw new HttpError(400, 'Barangay and complete address are required.');
  if (input.cityMunicipality !== undefined && !city) throw new HttpError(400, 'City or municipality is required.');
  const recordedCity = address.split(/[,;\n]/).map(part => part.trim()).findLast(part => /^(?:city of [\p{L} .'-]+|[\p{L} .'-]+ city)$/iu.test(part));
  const explicitCity = recordedCity && /\blipa\s+city$/i.test(recordedCity) ? 'Lipa City' : recordedCity;
  const cityKey = value => key(value).replace(/^city of\s+|\s+city$/g, '');
  if (city && explicitCity && cityKey(city) !== cityKey(explicitCity)) throw new HttpError(400, 'The complete address and selected city differ. Review the city or municipality before saving.');
  if (['lipa', 'lipa city', 'city of lipa'].includes(key(city))) {
    const official = names.find(name => key(name) === key(barangay));
    if (!official) throw new HttpError(400, 'Choose an official Lipa City barangay from the suggestions.');
    barangay = official;
    if (!/\b(?:lipa\s+city|city\s+of\s+lipa)\b/i.test(address)) address = [address, 'Lipa City'].filter(Boolean).join(', ');
  } else if (city) {

    if (!key(address).includes(key(city))) address = [address, city].filter(Boolean).join(', ');
  }
  return { barangay, address };
}
module.exports = { registrationAddress };
