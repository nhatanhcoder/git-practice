import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

export class JoinClassDto {
  // Codes are generated from an unambiguous alphabet (no I/O/0/1) and stored CHAR(8), so a
  // student typing a code off a whiteboard is normalised here rather than in the service:
  // trimmed and upper-cased, then shape-checked. An invalid shape is a validation error, not
  // CLASS_ENROLL_CODE_INVALID — that code means "this code does not name a class", which is a
  // different thing from "this is not a code at all".
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsString()
  @Length(8, 8, { message: 'Mã ghi danh gồm đúng 8 ký tự' })
  @Matches(/^[A-Z0-9]{8}$/, { message: 'Mã ghi danh chỉ gồm chữ in hoa và chữ số' })
  enrollmentCode!: string;
}
