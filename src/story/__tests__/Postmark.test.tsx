import React from 'react';
import { render } from '@testing-library/react-native';
import { Postmark } from '../Postmark';

test('renders location text uppercase truncated to 10 chars', () => {
  const { getByText } = render(
    <Postmark
      locationLabel="Valenzuela, Metro Manila"
      date="2026-04-27T00:00:00.000Z"
      inkColor="rgba(120,80,20,0.45)"
    />,
  );
  expect(getByText(/VALENZUELA/)).toBeTruthy();
});

test('renders date in APR 27 format', () => {
  const { getByText } = render(
    <Postmark
      locationLabel="Manila"
      date="2026-04-27T00:00:00.000Z"
      inkColor="rgba(120,80,20,0.45)"
    />,
  );
  expect(getByText(/APR 27/)).toBeTruthy();
});

test('renders null when locationLabel is null', () => {
  const { toJSON } = render(
    <Postmark
      locationLabel={null}
      date="2026-04-27T00:00:00.000Z"
      inkColor="rgba(120,80,20,0.45)"
    />,
  );
  expect(toJSON()).toBeNull();
});

test('takes only first segment before comma', () => {
  const { getByText } = render(
    <Postmark
      locationLabel="Quezon City, Metro Manila"
      date="2026-04-27T00:00:00.000Z"
      inkColor="rgba(120,80,20,0.45)"
    />,
  );
  expect(getByText(/QUEZON CIT/)).toBeTruthy(); // truncated at 10 chars
});
