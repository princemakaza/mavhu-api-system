import { PartialType } from '@nestjs/swagger';
import { CreateCropCycleDto } from './create-crop-cycle.dto';

export class UpdateCropCycleDto extends PartialType(CreateCropCycleDto) {}
