import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { MIN_BIRTH_YEAR } from '../marketing-rules';

export const GENDERS = ['female', 'male', 'other', 'prefer_not_to_say'] as const;
export const OCCUPATIONS = ['student', 'office_worker', 'teacher', 'freelancer', 'other'] as const;
export const LEARNING_GOALS = ['study_abroad', 'work', 'certificate', 'hobby', 'other'] as const;
export const MARKETING_CHANNELS = ['email', 'sms', 'zalo'] as const;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/**
 * Every field is optional. The signup flow creates the account first and offers this
 * separately, so a person who skips the whole step is in a valid state, not a broken one.
 */
export class UpdateMarketingProfileDto {
  // Year only — never a full date of birth. A year is enough for an age bracket and it is
  // what decides whether this person can consent for themselves at all.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(MIN_BIRTH_YEAR)
  @Max(new Date().getUTCFullYear())
  birthYear?: number;

  @IsOptional()
  @IsIn(GENDERS)
  gender?: (typeof GENDERS)[number];

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  province?: string;

  // Vietnamese mobile numbers, with or without the +84 form. Rejecting a malformed number at
  // the edge is the point: a phone column full of unusable strings is worse than an empty one,
  // because it looks like reach that is not there.
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.replace(/[\s.-]/g, '') : value))
  @IsString()
  @Matches(/^(?:\+84|0)\d{9}$/, {
    message: 'phone phải là số di động Việt Nam hợp lệ (0xxxxxxxxx hoặc +84xxxxxxxxx)',
  })
  phone?: string;

  @IsOptional()
  @IsIn(OCCUPATIONS)
  occupation?: (typeof OCCUPATIONS)[number];

  @IsOptional()
  @IsIn(LEARNING_GOALS)
  learningGoal?: (typeof LEARNING_GOALS)[number];

  // 0 means "starting from nothing", which is a real answer and a useful one for targeting.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(9)
  currentLevel?: number;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  referralSource?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  utmSource?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 100)
  utmMedium?: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @Length(1, 150)
  utmCampaign?: string;

  // Consent is a field like any other on the wire, but the service does not store it as sent:
  // marketing-rules.ts decides the stored value, stamps the version and timestamp, and refuses
  // a minor's self-consent.
  @IsOptional()
  @IsBoolean()
  marketingConsent?: boolean;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsIn(MARKETING_CHANNELS, { each: true })
  consentChannels?: (typeof MARKETING_CHANNELS)[number][];
}
