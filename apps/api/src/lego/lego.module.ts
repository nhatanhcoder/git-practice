import { Module } from '@nestjs/common';
import { LegoService } from './lego.service';
import { StudentLegoController } from './student-lego.controller';

@Module({
  controllers: [StudentLegoController],
  providers: [LegoService],
  exports: [LegoService],
})
export class LegoModule {}
