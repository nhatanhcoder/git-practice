import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { MonitoringService } from './monitoring.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { AdminMonitoringController } from './admin-monitoring.controller';

@Module({
  controllers: [AdminDashboardController, AdminMonitoringController],
  providers: [DashboardService, MonitoringService],
  exports: [DashboardService, MonitoringService],
})
export class DashboardModule {}
