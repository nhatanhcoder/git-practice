import { Equals } from 'class-validator';

export class SaveWritingProgressDto {
  @Equals(true)
  practised!: true;
}
