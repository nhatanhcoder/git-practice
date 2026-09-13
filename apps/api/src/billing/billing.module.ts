import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { AdminTuitionRatesController } from './admin-tuition-rates.controller';
import { AdminInvoicesController } from './admin-invoices.controller';
import { NotificationsModule } from '../notifications/notifications.module';
import { StudentInvoicesController } from './student-invoices.controller';

// NotificationsModule supplies the transaction-scoped create service: invoice creation
// writes its new_invoice row inside the same transaction as the invoice itself
// (INV-NOTIF-13, ENTITY_STUDENT_INVOICE "On creation → triggers new_invoice").
@Module({
  imports: [NotificationsModule],
  controllers: [AdminTuitionRatesController, AdminInvoicesController, StudentInvoicesController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
