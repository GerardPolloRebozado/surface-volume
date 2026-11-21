import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    AuthenticationModule.forRoot({
      session: {
        absoluteTtl: '14d', // signed out after 14 days, however active
        idleTtl: '3d', // or after 3 days without a request
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
