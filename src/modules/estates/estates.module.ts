import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Estate } from './entities/estate.entity';
import { EstatesController } from './estates.controller';
import { EstatesService } from './estates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Estate])],
  controllers: [EstatesController],
  providers: [EstatesService],
  exports: [EstatesService],
})
export class EstatesModule {}
