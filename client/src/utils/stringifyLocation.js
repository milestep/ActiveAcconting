import { stringify } from 'query-string';

const stringifyQuery = (query) =>
  stringify(query).replace(/%20/g, '+');

export function stringifyLocation(location) {
  const query = stringifyQuery(location.query);

  return `${location.pathname}${query && `?${query}`}`;
}
