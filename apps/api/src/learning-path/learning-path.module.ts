import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import {
  LearningUnit,
  LearningUnitSchema,
} from "../mongodb/schemas/learning-unit.schema";
import {
  UserLearningProgress,
  UserLearningProgressSchema,
} from "../mongodb/schemas/user-learning-progress.schema";
import { LearningPathService } from "./learning-path.service";
import { LearningPathController } from "./learning-path.controller";
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LearningUnit.name, schema: LearningUnitSchema },
      { name: UserLearningProgress.name, schema: UserLearningProgressSchema },
    ]),
  ],
  providers: [LearningPathService],
  controllers: [LearningPathController],
})
export class LearningPathModule {}
