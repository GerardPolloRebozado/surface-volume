import { Public } from '@nestjs/authentication';
import { Controller, Get, Param, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { HooksService } from './hooks.service';

@Public()
@Controller('hooks')
export class HooksController {
  constructor(private readonly hooks: HooksService) {}

  @Get(':token')
  async handshake(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    await this.respond(token, request, response);
  }

  @Post(':token')
  async receive(
    @Param('token') token: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    await this.respond(token, request, response);
  }

  private async respond(token: string, request: Request, response: Response) {
    const handshake = await this.hooks.receive(token, {
      method: request.method,
      headers: request.headers as Record<string, string>,
      query: request.query as Record<string, string>,
      body: request.body,
      rawBody: (request as Request & { rawBody?: Buffer }).rawBody,
    });

    if (handshake) {
      response.status(handshake.status).send(handshake.body);
      return;
    }

    response.status(200).json({ ok: true });
  }
}
