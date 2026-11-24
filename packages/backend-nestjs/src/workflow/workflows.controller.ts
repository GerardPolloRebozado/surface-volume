import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { WorkflowCrudService } from './workflow-crud.service';
import { WorkflowListItemDto, WorkflowSummaryDto } from './workflow-list.dto';
import {
  CreateWorkflowDto,
  RunNowDto,
  SaveWorkflowDto,
} from './workflows.dto';

@ApiTags('workflows')
@Controller('workflows')
export class WorkflowsController {
  constructor(private readonly workflows: WorkflowCrudService) {}

  @Get()
  @ApiOperation({ summary: 'List workflows with their last run' })
  @ApiOkResponse({ type: [WorkflowListItemDto] })
  async list(@CurrentUser() user: { id: string }) {
    return this.workflows.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create an empty workflow' })
  @ApiCreatedResponse({ type: WorkflowSummaryDto })
  async create(
    @CurrentUser() user: { id: string },
    @Body() body: CreateWorkflowDto,
  ) {
    return this.workflows.create(user.id, body.name, body.description);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Read a workflow definition' })
  @ApiOkResponse({ type: WorkflowSummaryDto })
  @ApiNotFoundResponse()
  async get(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.workflows.get(user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Save a new workflow version' })
  @ApiOkResponse({ type: WorkflowSummaryDto })
  @ApiNotFoundResponse()
  async save(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body() body: SaveWorkflowDto,
  ) {
    return this.workflows.save(user.id, id, body.name, body.description, body.definition);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Activate the saved version' })
  @ApiOkResponse({ type: WorkflowSummaryDto })
  @ApiNotFoundResponse()
  async enable(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.workflows.enable(user.id, id);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Stop the workflow trigger' })
  @ApiOkResponse({ type: WorkflowSummaryDto })
  @ApiNotFoundResponse()
  async disable(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ) {
    return this.workflows.disable(user.id, id);
  }

  @Post(':id/run')
  @ApiOperation({ summary: 'Start a manual run' })
  @ApiOkResponse({ type: RunNowDto })
  @ApiNotFoundResponse()
  async run(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<RunNowDto> {
    return this.workflows.runNow(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse()
  async remove(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<void> {
    await this.workflows.remove(user.id, id);
  }
}
