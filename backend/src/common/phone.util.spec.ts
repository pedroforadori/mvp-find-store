import { normalizarTelefone } from './phone.util';

describe('normalizarTelefone', () => {
  it('normaliza celular com DDI e dígitos puros (formato recebido do webhook)', () => {
    expect(normalizarTelefone('5511987654321')).toBe('+5511987654321');
  });

  it('normaliza celular sem DDI', () => {
    expect(normalizarTelefone('11987654321')).toBe('+5511987654321');
  });

  it('normaliza telefone fixo com DDI', () => {
    expect(normalizarTelefone('551132345678')).toBe('+551132345678');
  });

  it('normaliza número com prefixo de tronco zero', () => {
    expect(normalizarTelefone('011987654321')).toBe('+5511987654321');
  });

  it('retorna null para entrada vazia ou nula', () => {
    expect(normalizarTelefone('')).toBeNull();
    expect(normalizarTelefone(null)).toBeNull();
    expect(normalizarTelefone(undefined)).toBeNull();
  });

  it('retorna null para DDD inválido', () => {
    expect(normalizarTelefone('0012345678')).toBeNull();
  });

  it('retorna null para celular de 9 dígitos que não começa com 9', () => {
    expect(normalizarTelefone('11812345678')).toBeNull();
  });

  it('retorna null para número muito curto', () => {
    expect(normalizarTelefone('1234')).toBeNull();
  });
});
