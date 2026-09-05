import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { PayrollService } from './payroll.service';
import { CreatePayRateDto } from './dto/create-pay-rate.dto';
import { ListPayRatesQuery } from './dto/list-pay-rates.query';

@ApiTags('admin/pay-rates')
@ApiBearerAuth()
@Controller('admin/pay-rates')
@Roles('admin')
export class AdminPayRatesController {
  constructor(@Inject(PayrollService) private readonly payrollService: PayrollService) {}

  @Post()
  @ApiOperation({ summary: 'Append new pay rate for a teacher' })
  create(@Body() dto: CreatePayRateDto) {
    return this.payrollService.createPayRate(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List pay rates or rate history' })
  list(@Query() query: ListPayRatesQuery) {
    return this.payrollService.listPayRates(query);
  }
}
