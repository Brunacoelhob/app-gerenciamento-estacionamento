import { ApiProperty } from '@nestjs/swagger'
import { IsNotEmpty, IsString } from 'class-validator'

export class GoogleDto {
  @ApiProperty({ description: 'ID token assinado pelo Google (Google Identity Services).', example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6...' })
  @IsString({ message: 'Não foi possível ler os dados da conta Google.' })
  @IsNotEmpty({ message: 'Não foi possível ler os dados da conta Google.' })
  credential!: string
}
