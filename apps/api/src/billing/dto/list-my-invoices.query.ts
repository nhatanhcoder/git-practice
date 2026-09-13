import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '@prisma/client';

// Deliberately NO `studentId` field: on this route the student is the token
// (06-billing.md §5, INV-BILLING-33). `?studentId=` from the URL is simply not
// part of the accepted query — whitelist + forbidNonWhitelisted reject it
// with VALIDATION_ERROR rather than letting a caller influence the filter.
// `page`/`limit` and a `status` filter are the only knobs (API_STUDENT.md
// § Billing defines the two routes as list-own / detail).
export class ListMyInvoicesQuery {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}
