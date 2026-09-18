import { Body, Controller, ForbiddenException, Get, HttpCode, Logger, Post, Query } from '@nestjs/common';

import { extrairEventos, isValidWhatsAppWebhookPayload } from './whatsapp.types';
import { WhatsappService } from './whatsapp.service';

@Controller('webhook/whatsapp')
export class WhatsappController {
  private readonly logger = new Logger(WhatsappController.name);

  constructor(private readonly whatsappService: WhatsappService) {}

  @Get()
  verificar(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    if (mode === 'subscribe' && verifyToken === process.env.WHATSAPP_VERIFY_TOKEN) {
      return challenge;
    }
    throw new ForbiddenException('Token de verificação inválido');
  }

  @Post()
  @HttpCode(200)
  async receber(@Body() body: unknown): Promise<{ status: string }> {
    if (!isValidWhatsAppWebhookPayload(body)) {
      this.logger.warn('Payload do webhook do WhatsApp com formato inesperado');
      return { status: 'ignorado' };
    }

    const eventos = extrairEventos(body);
    for (const evento of eventos) {
      try {
        await this.whatsappService.processarEvento(evento);
      } catch (erro) {
        this.logger.error(`Falha ao processar evento do WhatsApp: ${erro}`);
      }
    }

    return { status: 'ok' };
  }
}
