import { IsIn, IsString } from 'class-validator';

export class UpdateOrganizationStatusDto {
  @IsString()
  @IsIn(['active', 'suspended'])
  status!: 'active' | 'suspended';
}