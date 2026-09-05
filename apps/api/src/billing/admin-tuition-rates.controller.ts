import { Body, Controller, Get, Inject, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { BillingService } from './billing.service';
import { CreateTuitionRateDto } from './dto/create-tuition-rate.dto';
import { ListTuitionRatesQuery } from './dto/list-tuition-rates.query';

@ApiTags('admin/tuition-rates')
@ApiBearerAuth()
@Controller('admin/tuition-rates')
@Roles('admin')
export class AdminTuitionRatesController {
  constructor(@Inject(BillingService) private readonly billingService: BillingService) {}

  @Post()
  @ApiOperation({ summary: 'Append new tuition rate for a student' })
  create(@Body() dto: CreateTuitionRateDto) {
    return this.billingService.createTuitionRate(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List tuition rates or rate history' })
  list(@Query() query: ListTuitionRatesQuery) {
    return this.billingService.listTuitionRates(query);
  }
}
