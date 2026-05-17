import { Injectable } from '@nestjs/common';

@Injectable()
export class JwtStrategy {
  constructor() {
    // Configurações da estratégia JWT podem ser definidas aqui
  }

  validate(payload: any) {
    // Lógica para validar o token JWT e extrair as informações do usuário
    return { userId: payload.sub, email: payload.email };
  }
}
