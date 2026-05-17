import { IsString, MinLength } from 'class-validator';

export class RespondReviewDto {
  @IsString()
  @MinLength(2)
  response: string;
}
