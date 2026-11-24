import { Body, Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@nestjs/authentication';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { ConnectionsService } from './connections.service';
import {
  ConnectionResourceDto,
  ConnectionTestDto,
  CreateConnectionDto,
} from './connections.dto';

@ApiTags('connections')
@Controller('connections')
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}

  @Get()
  @ApiOperation({ summary: 'List the current user connections' })
  @ApiOkResponse({ type: [ConnectionResourceDto] })
  async list(@CurrentUser() user: { id: string }): Promise<ConnectionResourceDto[]> {
    return this.connections.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Connect an app with credentials' })
  @ApiCreatedResponse({ type: ConnectionResourceDto })
  @ApiConflictResponse()
  @ApiUnprocessableEntityResponse()
  async create(
    @CurrentUser() user: { id: string },
    @Body() body: CreateConnectionDto,
  ): Promise<ConnectionResourceDto> {
    return this.connections.create(user.id, body);
  }

  @Post(':id/test')
  @HttpCode(200)
  @ApiOperation({ summary: 'Re-check a connection against its provider' })
  @ApiOkResponse({ type: ConnectionTestDto })
  @ApiNotFoundResponse()
  async test(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<ConnectionTestDto> {
    return this.connections.test(user.id, id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiOperation({ summary: 'Disconnect an app and disable its workflows' })
  @ApiNotFoundResponse()
  async revoke(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<void> {
    await this.connections.revoke(user.id, id);
  }
}
