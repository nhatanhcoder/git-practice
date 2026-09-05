import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { ListPayrollQuery } from './dto/list-payroll.query';

@ApiTags('admin/payroll')
@ApiBearerAuth()
@Controller('admin/payroll')
@Roles('admin')
export class AdminPayrollController {
  constructor(@Inject(PayrollService) private readonly payrollService: PayrollService) {}

  @Post()
  @ApiOperation({ summary: 'Create a draft payroll period for a teacher' })
  create(@Body() dto: CreatePayrollDto) {
    return this.payrollService.createPayrollPeriod(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List payroll periods, paginated' })
  list(@Query() query: ListPayrollQuery) {
    return this.payrollService.listPayrollPeriods(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payroll period details and session breakdown' })
  detail(@Param('id') id: string) {
    return this.payrollService.getPayrollPeriodDetail(id);
  }

  @Patch(':id/finalize')
  @ApiOperation({ summary: 'Finalize a draft payroll period' })
  finalize(@Param('id') id: string) {
    return this.payrollService.finalizePayrollPeriod(id);
  }

  @Patch(':id/pay')
  @ApiOperation({ summary: 'Mark a finalized payroll period as paid' })
  pay(@Param('id') id: string) {
    return this.payrollService.payPayrollPeriod(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete draft payroll period and unassign sessions (API-003)' })
  delete(@Param('id') id: string) {
    return this.payrollService.deletePayrollPeriod(id);
  }
}
