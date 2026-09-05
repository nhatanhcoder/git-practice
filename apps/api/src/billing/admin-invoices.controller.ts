import { Body, Controller, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ListInvoicesQuery } from './dto/list-invoices.query';
import { VoidInvoiceDto } from './dto/void-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { BatchInvoiceCreateDto, BatchInvoicePreviewDto } from './dto/batch-invoice.dto';

@ApiTags('admin/invoices')
@ApiBearerAuth()
@Controller('admin/invoices')
@Roles('admin')
export class AdminInvoicesController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get aggregated summary figures for invoice dashboard header' })
  summary(@Query() query: ListInvoicesQuery) {
    return this.billingService.getInvoiceSummary(query);
  }

  @Post('batch/preview')
  @ApiOperation({ summary: 'Preview batch invoice generation without writing to database' })
  batchPreview(@Body() dto: BatchInvoicePreviewDto) {
    return this.billingService.batchPreview(dto);
  }

  @Post('batch')
  @ApiOperation({ summary: 'Execute batch invoice generation for a period' })
  batchCreate(@Body() dto: BatchInvoiceCreateDto) {
    return this.billingService.batchCreate(dto);
  }

  @Post()
  @ApiOperation({ summary: 'Create a single invoice for a student' })
  create(@Body() dto: CreateInvoiceDto) {
    return this.billingService.createInvoice(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List invoices with pagination and filters' })
  list(@Query() query: ListInvoicesQuery) {
    return this.billingService.listInvoices(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice details with embedded payments' })
  detail(@Param('id') id: string) {
    return this.billingService.getInvoiceDetail(id);
  }

  @Patch(':id/void')
  @ApiOperation({ summary: 'Void an invoice (one-way gate)' })
  void(@Param('id') id: string, @Body() dto: VoidInvoiceDto) {
    return this.billingService.voidInvoice(id, dto);
  }

  @Post(':id/payments')
  @ApiOperation({ summary: 'Record payment for an invoice' })
  recordPayment(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.billingService.recordPayment(user.id, id, dto);
  }
}
