export interface WhatsAppWebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      field: string;
      value: {
        messages?: Array<{
          from: string;
          type: string;
          text?: { body: string };
          interactive?: {
            type: string;
            button_reply?: { id: string; title: string };
          };
          button?: { text: string; payload: string };
        }>;
      };
    }>;
  }>;
}

export interface EventoWhatsApp {
  telefone: string;
  buttonId?: string;
  textoLivre?: string;
}

export function isValidWhatsAppWebhookPayload(body: unknown): body is WhatsAppWebhookPayload {
  if (typeof body !== 'object' || body === null) return false;
  const payload = body as Record<string, unknown>;
  return payload.object === 'whatsapp_business_account' && Array.isArray(payload.entry);
}

export function extrairEventos(payload: WhatsAppWebhookPayload): EventoWhatsApp[] {
  const eventos: EventoWhatsApp[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const mensagem of change.value?.messages ?? []) {
        if (!mensagem.from) continue;

        if (mensagem.type === 'interactive' && mensagem.interactive?.button_reply) {
          eventos.push({ telefone: mensagem.from, buttonId: mensagem.interactive.button_reply.id });
        } else if (mensagem.type === 'button' && mensagem.button) {
          eventos.push({ telefone: mensagem.from, buttonId: mensagem.button.payload });
        } else if (mensagem.type === 'text' && mensagem.text) {
          eventos.push({ telefone: mensagem.from, textoLivre: mensagem.text.body });
        }
      }
    }
  }

  return eventos;
}
