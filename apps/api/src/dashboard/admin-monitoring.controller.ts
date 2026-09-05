import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { MonitoringService } from './monitoring.service';

@ApiTags('admin/monitoring')
@ApiBearerAuth()
@Controller('admin/monitoring')
@Roles('admin')
export class AdminMonitoringController {
  constructor(@Inject(MonitoringService) private readonly monitoringService: MonitoringService) {}

  @Get('gemini')
  @ApiOperation({ summary: 'Get Gemini API key status, model and token quota (ADR-014)' })
  gemini() {
    return this.monitoringService.getGeminiStatus();
  }

  @Get('health')
  @ApiOperation({ summary: 'Get health probes for all infrastructure services' })
  health() {
    return this.monitoringService.getHealthProbes();
  }
}
