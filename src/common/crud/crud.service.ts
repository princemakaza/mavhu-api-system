import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DeepPartial, FindOptionsWhere, ObjectLiteral, Repository } from 'typeorm';
import { PaginatedResponseDto } from '../dto/paginated-response.dto';
import { PaginationQueryDto, SortOrder } from '../dto/pagination-query.dto';

/**
 * Generic CRUD base every module's service extends, so all 13 resources in
 * this API expose the exact same 9 operations with the same semantics:
 * create, findAll, findOne, update, replace, remove, restore, count, exists.
 *
 * Concrete services only need to pass their repository and, when the table
 * has an `is_deleted` column, the property name that backs it so remove()
 * soft-deletes instead of hard-deleting.
 */
export abstract class CrudService<T extends ObjectLiteral> {
  protected constructor(
    protected readonly repository: Repository<T>,
    protected readonly softDeleteColumn: (keyof T & string) | null = null,
    protected readonly entityName: string = 'Resource',
  ) {}

  async create(dto: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async findAll(query: PaginationQueryDto): Promise<PaginatedResponseDto<T>> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const limit = query.limit && query.limit > 0 ? Math.min(query.limit, 100) : 20;

    const where = this.buildSoftDeleteWhere(query.includeDeleted);
    const order = query.sortBy
      ? ({ [query.sortBy]: query.sortOrder ?? SortOrder.ASC } as any)
      : undefined;

    const [data, total] = await this.repository.findAndCount({
      where,
      order,
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  async findOne(id: number): Promise<T> {
    const entity = await this.repository.findOne({ where: { id } as unknown as FindOptionsWhere<T> });
    if (!entity) {
      throw new NotFoundException(`${this.entityName} with id ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: DeepPartial<T>): Promise<T> {
    const entity = await this.findOne(id);
    Object.assign(entity as object, dto);
    return this.repository.save(entity);
  }

  async replace(id: number, dto: DeepPartial<T>): Promise<T> {
    await this.findOne(id);
    await this.repository.save({ ...(dto as object), id } as unknown as T);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ id: number; deleted: boolean; softDeleted: boolean }> {
    const entity = (await this.findOne(id)) as Record<string, unknown>;

    if (this.softDeleteColumn) {
      entity[this.softDeleteColumn] = true;
      await this.repository.save(entity as unknown as T);
      return { id, deleted: true, softDeleted: true };
    }

    await this.repository.remove(entity as unknown as T);
    return { id, deleted: true, softDeleted: false };
  }

  async restore(id: number): Promise<T> {
    if (!this.softDeleteColumn) {
      throw new BadRequestException(`${this.entityName} does not support restore (no soft-delete flag)`);
    }

    const entity = (await this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    })) as Record<string, unknown> | null;

    if (!entity) {
      throw new NotFoundException(`${this.entityName} with id ${id} not found`);
    }

    entity[this.softDeleteColumn] = false;
    return this.repository.save(entity as unknown as T);
  }

  async count(includeDeleted = false): Promise<number> {
    const where = this.buildSoftDeleteWhere(includeDeleted);
    return this.repository.count({ where });
  }

  async exists(id: number): Promise<boolean> {
    const count = await this.repository.count({ where: { id } as unknown as FindOptionsWhere<T> });
    return count > 0;
  }

  private buildSoftDeleteWhere(includeDeleted?: boolean): FindOptionsWhere<T> | undefined {
    if (!this.softDeleteColumn || includeDeleted) {
      return undefined;
    }
    return { [this.softDeleteColumn]: false } as unknown as FindOptionsWhere<T>;
  }
}
