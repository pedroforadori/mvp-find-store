import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { LeadsModule } from './leads/leads.module';
import { SupabaseModule } from './supabase/supabase.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';

@Module({
  imports: [SupabaseModule, LeadsModule, WhatsappModule],
  controllers: [AppController],
})
export class AppModule {}
