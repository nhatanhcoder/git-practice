import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AdminTuitionRatesController } from './admin-tuition-rates.controller';
import { AdminInvoicesController } from './admin-invoices.controller';

@Module({
  controllers: [AdminTuitionRatesController, AdminInvoicesController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
