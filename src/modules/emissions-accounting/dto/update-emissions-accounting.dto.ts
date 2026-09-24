import { PartialType } from '@nestjs/swagger';
import { CreateEmissionsAccountingDto } from './create-emissions-accounting.dto';

export class UpdateEmissionsAccountingDto extends PartialType(CreateEmissionsAccountingDto) {}
