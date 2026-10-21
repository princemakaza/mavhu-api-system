import { Module } from '@nestjs/common';
import { CbzModule } from '../cbz/cbz.module';
import { AgriController } from './agri.controller';
import { AgriGuard } from './agri.guard';
import { AgriService } from './agri.service';

/** Agri MRV portal for agribusiness ESG users (CbzModule supplies the JwtModule the guard uses). */
@Module({
  imports: [CbzModule],
  controllers: [AgriController],
  providers: [AgriService, AgriGuard],
})
export class AgriModule {}
