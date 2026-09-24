import { PartialType } from '@nestjs/swagger';
import { CreateEstateDto } from './create-estate.dto';

export class UpdateEstateDto extends PartialType(CreateEstateDto) {}
