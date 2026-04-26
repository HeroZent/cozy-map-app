import { checkCrisis } from '../crisisTripwire';

// English — explicit
test('detects "kill myself"', () => expect(checkCrisis('I want to kill myself')).toBe(true));
test('detects "want to die"', () => expect(checkCrisis("I don't want to die")).toBe(true));
test('detects "end it all"', () => expect(checkCrisis('I just want to end it all')).toBe(true));
test('detects "suicidal"', () => expect(checkCrisis("I've been feeling suicidal lately")).toBe(true));
test('detects "better off dead"', () => expect(checkCrisis('everyone would be better off dead')).toBe(true));
test('detects "no reason to live"', () => expect(checkCrisis('there is no reason to live anymore')).toBe(true));
test('detects "take my own life"', () => expect(checkCrisis('thinking about taking my own life')).toBe(true));
// Filipino — explicit
test('detects "magpapakamatay"', () => expect(checkCrisis('magpapakamatay na ako')).toBe(true));
test('detects "ayoko na mabuhay"', () => expect(checkCrisis('ayoko na mabuhay')).toBe(true));
test('detects "tatapusin ko na"', () => expect(checkCrisis('tatapusin ko na ang lahat')).toBe(true));
test('detects "gusto ko nang mamatay"', () => expect(checkCrisis('gusto ko nang mamatay')).toBe(true));
test('detects "patayin ko na ang sarili"', () => expect(checkCrisis('patayin ko na ang sarili ko')).toBe(true));
// Case insensitive
test('is case-insensitive', () => expect(checkCrisis('Kill Myself')).toBe(true));
test('is case-insensitive Filipino', () => expect(checkCrisis('MAGPAPAKAMATAY')).toBe(true));
// Safe phrases — must not fire
test('does not flag safe text', () => expect(checkCrisis('I want to live my best life')).toBe(false));
test('does not flag empty string', () => expect(checkCrisis('')).toBe(false));
test('does not flag normal struggle', () => expect(checkCrisis("I've been having a rough week")).toBe(false));
test('does not flag "die hard fan"', () => expect(checkCrisis('I am a die hard fan')).toBe(false));
