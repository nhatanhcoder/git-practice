import { PartialType } from '@nestjs/mapped-types';
import { CreateQuestionDto } from './create-question.dto';

/**
 * Every field optional, but the service re-runs the same cross-field checks on the
 * merged result — validating only what was sent would let a PATCH that changes
 * `skill` alone leave a writing question holding a correctAnswer.
 */
export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {}
