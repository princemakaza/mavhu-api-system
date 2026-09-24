import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApisController } from './apis.controller';
import { ApisService } from './apis.service';
import { Api } from './entities/api.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Api])],
  controllers: [ApisController],
  providers: [ApisService],
  exports: [ApisService],
})
export class ApisModule {}
