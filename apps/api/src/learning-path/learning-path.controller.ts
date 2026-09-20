import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Roles } from "../common/decorators/roles.decorator";
import {
  CurrentUser,
  type AuthenticatedUser,
} from "../common/decorators/current-user.decorator";
import { AppException } from "../common/errors/app.exception";
import { ErrorCode } from "../common/errors/error-codes";
import { LearningPathService } from "./learning-path.service";
import {
  LearningPathQuery,
  LearningRevisionDto,
  SaveLearningAnswerDto,
  StudyWordDto,
} from "./learning-path.dto";
@ApiTags("student/learning-path")
@ApiBearerAuth()
@Roles("student")
@Controller("student/learning-path")
export class LearningPathController {
  constructor(private readonly service: LearningPathService) {}
  @Get("curricula")
  curricula(@CurrentUser() u: AuthenticatedUser) {
    return this.service.curricula(u.id);
  }
  @Get() catalog(
    @CurrentUser() u: AuthenticatedUser,
    @Query() q: LearningPathQuery,
  ) {
    return this.service.catalog(u.id, q);
  }
  @Get(":slug") detail(
    @CurrentUser() u: AuthenticatedUser,
    @Param("slug") slug: string,
  ) {
    return this.service.detail(u.id, slug);
  }
  @Post(":slug/start")
  @HttpCode(200)
  start(
    @CurrentUser() u: AuthenticatedUser,
    @Param("slug") slug: string,
    @Body() body: unknown,
  ) {
    if (
      body != null &&
      (typeof body !== "object" ||
        Array.isArray(body) ||
        Object.keys(body).length > 0)
    )
      throw new AppException(
        ErrorCode.VALIDATION_ERROR,
        "Start does not accept fields",
      );
    return this.service.start(u.id, slug);
  }
  @Post(":slug/study")
  @HttpCode(200)
  study(
    @CurrentUser() u: AuthenticatedUser,
    @Param("slug") slug: string,
    @Body() dto: StudyWordDto,
  ) {
    return this.service.study(u.id, slug, dto);
  }
  @Post(":slug/answers")
  @HttpCode(200)
  answer(
    @CurrentUser() u: AuthenticatedUser,
    @Param("slug") slug: string,
    @Body() dto: SaveLearningAnswerDto,
  ) {
    return this.service.answer(u.id, slug, dto);
  }
  @Post(":slug/complete")
  @HttpCode(200)
  complete(
    @CurrentUser() u: AuthenticatedUser,
    @Param("slug") slug: string,
    @Body() dto: LearningRevisionDto,
  ) {
    return this.service.complete(u.id, slug, dto.revision);
  }
}
