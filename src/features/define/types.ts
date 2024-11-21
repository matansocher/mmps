import { IsBoolean, IsDefined, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class ContactRequestDTO {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  @IsEmail()
  readonly email!: string;
}

export class ContactResponseDTO {
  @IsBoolean()
  readonly success: boolean;
}
