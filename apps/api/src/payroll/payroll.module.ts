import { Module } from '@nestjs/common';
import { PayrollService } from './payroll.service';
import { AdminPayRatesController } from './admin-pay-rates.controller';
import { AdminPayrollController } from './admin-payroll.controller';

@Module({
  controllers: [AdminPayRatesController, AdminPayrollController],
  providers: [PayrollService],
  exports: [PayrollService],
})
export class PayrollModule {}
