/**
 * Consent rules for the marketing profile.
 *
 * Kept as pure functions with no Prisma and no Nest, so the rules can be tested directly
 * instead of through an HTTP round trip. The service calls these; it does not re-implement
 * them.
 *
 * The point of the whole table is that the data is usable for advertising. It only is if the
 * consent behind it is valid, so these rules are what give the stored fields their value —
 * they are not paperwork bolted on afterwards.
 */

/**
 * Bump when the wording of the consent text changes. Stored on the row, so a later question
 * of the form "what exactly did this person agree to?" has an answer. A boolean alone cannot
 * answer that, which is why the column exists.
 */
export const CONSENT_VERSION = '2026-09-05.v1';

/** Below this age a person cannot give valid consent for their own data to be used in ads. */
export const GUARDIAN_CONSENT_AGE = 16;

export const MIN_BIRTH_YEAR = 1900;

export type MarketingChannelName = 'email' | 'sms' | 'zalo';

export function currentYear(now: Date = new Date()): number {
  return now.getUTCFullYear();
}

export function isBirthYearInRange(birthYear: number, now: Date = new Date()): boolean {
  return Number.isInteger(birthYear) && birthYear >= MIN_BIRTH_YEAR && birthYear <= currentYear(now);
}

/**
 * Age from a birth year is approximate by one year — we deliberately never collect a full
 * date of birth, so this rounds in the direction that assumes the person is YOUNGER
 * (year difference, not birthday-adjusted). If that puts them under the threshold, they get
 * the protective branch. Guessing older would be the guess that removes a protection.
 */
export function requiresGuardianConsent(
  birthYear: number | null | undefined,
  now: Date = new Date(),
): boolean {
  if (birthYear === null || birthYear === undefined) return false;
  if (!isBirthYearInRange(birthYear, now)) return false;
  return currentYear(now) - birthYear < GUARDIAN_CONSENT_AGE;
}

export interface ConsentInput {
  marketingConsent?: boolean;
  consentChannels?: MarketingChannelName[];
  birthYear?: number | null;
}

export interface ConsentState {
  marketingConsent: boolean;
  consentChannels: MarketingChannelName[];
  consentVersion: string | null;
  consentedAt: Date | null;
  withdrawnAt: Date | null;
  guardianConsentRequired: boolean;
}

/**
 * Works out the consent columns from what the caller asked for and what is already stored.
 *
 * Three rules are enforced here rather than trusted to the client:
 *
 *  - A minor's request to consent is refused, not silently stored. The row keeps
 *    `guardianConsentRequired = true` and `marketingConsent = false`, so a later query for
 *    "who may we advertise to" cannot pick them up by accident.
 *  - Granting stamps `consentedAt` and the version. Re-sending the same true value does not
 *    move the timestamp: the person consented when they first did, not on every profile save.
 *  - Withdrawing stamps `withdrawnAt` and clears the channels. Keeping channels on a withdrawn
 *    consent is how "we still had their email in the list" happens.
 */
export function resolveConsent(
  input: ConsentInput,
  existing: Partial<ConsentState> | null,
  now: Date = new Date(),
): ConsentState {
  const birthYear = input.birthYear !== undefined ? input.birthYear : null;
  const guardianConsentRequired = requiresGuardianConsent(birthYear, now);

  const wasConsented = existing?.marketingConsent === true;
  const requested = input.marketingConsent;

  if (guardianConsentRequired) {
    return {
      marketingConsent: false,
      consentChannels: [],
      consentVersion: existing?.consentVersion ?? null,
      consentedAt: existing?.consentedAt ?? null,
      withdrawnAt: wasConsented ? now : (existing?.withdrawnAt ?? null),
      guardianConsentRequired: true,
    };
  }

  if (requested === true) {
    return {
      marketingConsent: true,
      // An empty channel list with consent granted would be consent to be contacted by no
      // means at all. Default to email, the channel the account already implies.
      consentChannels: input.consentChannels?.length ? input.consentChannels : ['email'],
      consentVersion: CONSENT_VERSION,
      consentedAt: wasConsented ? (existing?.consentedAt ?? now) : now,
      withdrawnAt: null,
      guardianConsentRequired: false,
    };
  }

  if (requested === false) {
    return {
      marketingConsent: false,
      consentChannels: [],
      consentVersion: existing?.consentVersion ?? null,
      consentedAt: existing?.consentedAt ?? null,
      withdrawnAt: wasConsented ? now : (existing?.withdrawnAt ?? null),
      guardianConsentRequired: false,
    };
  }

  // Not mentioned in this request: leave consent exactly as it was. A profile edit that does
  // not talk about consent must never change it.
  return {
    marketingConsent: existing?.marketingConsent ?? false,
    consentChannels: existing?.consentChannels ?? [],
    consentVersion: existing?.consentVersion ?? null,
    consentedAt: existing?.consentedAt ?? null,
    withdrawnAt: existing?.withdrawnAt ?? null,
    guardianConsentRequired: false,
  };
}
