import { ApiProperty } from '@nestjs/swagger';

export class CountResponseDto {
  @ApiProperty({ description: 'Number of records matching the query' })
  count: number;

  constructor(count: number) {
    this.count = count;
  }
}

export class ExistsResponseDto {
  @ApiProperty({ description: 'Whether a record with the given id exists' })
  exists: boolean;

  constructor(exists: boolean) {
    this.exists = exists;
  }
}

export class DeleteResponseDto {
  @ApiProperty({ description: 'Id of the affected record' })
  id: number;

  @ApiProperty({ description: 'Whether the record was deleted' })
  deleted: boolean;

  @ApiProperty({ description: 'Whether the delete was a soft delete (record flagged, not removed)' })
  softDeleted: boolean;

  constructor(id: number, deleted: boolean, softDeleted: boolean) {
    this.id = id;
    this.deleted = deleted;
    this.softDeleted = softDeleted;
  }
}
