import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';

import { AppModule } from '../src/app.module';

let server: Express | undefined;

async function bootstrapServer(): Promise<Express> {
  const expressApp = express();
  const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return expressApp;
}

export default async function handler(req: Request, res: Response) {
  if (!server) {
    server = await bootstrapServer();
  }
  server(req, res);
}
