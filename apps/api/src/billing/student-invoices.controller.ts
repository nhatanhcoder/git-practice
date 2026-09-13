import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { ListMyInvoicesQuery } from './dto/list-my-invoices.query';

// SCOPE-BILL-01 (06-billing.md §5): a dedicated student handler, never the admin
// handler reused with a `studentId` query param. The user id arrives from the
// token, and every query below keeps `studentId = actor.id AND status <> 'void'`
// in the WHERE — not as an `if` after reading (INV-BILLING-33).
@ApiTags('student/invoices')
@ApiBearerAuth()
@Controller('student/invoices')
@Roles('student')
export class StudentInvoicesController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  @Get()
  @ApiOperation({ summary: "List the authenticated student's own non-void invoices (S-BILL-1)" })
  listMine(@CurrentUser() user: AuthenticatedUser, @Query() query: ListMyInvoicesQuery) {
    return this.billingService.listMyInvoices(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: "One of the student's own invoices with payment history (S-BILL-2)" })
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.billingService.getMyInvoiceDetail(user.id, id);
  }
}
