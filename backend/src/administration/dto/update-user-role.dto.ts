import { IsNotEmpty, IsUUID } from 'class-validator';

export class UpdateUserRoleDto {
  @IsNotEmpty()
  @IsUUID()
  roleId!: string;
}