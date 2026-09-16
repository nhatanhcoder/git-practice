import { IsBoolean, IsIn, IsString, MaxLength } from 'class-validator';
import { FOUNDATION_KINDS } from '../foundation-rules';

/**
 * PUT /student/foundation/progress — explicit idempotent SET (D3).
 * Never a toggle: repeating the same body is a no-op by construction, and two
 * racing tabs converge on the last write instead of flipping a bit.
 */
export class SetFoundationProgressDto {
  @IsIn([...FOUNDATION_KINDS])
  kind!: string;

  @IsString()
  @MaxLength(120)
  key!: string;

  @IsBoolean()
  studied!: boolean;
}
