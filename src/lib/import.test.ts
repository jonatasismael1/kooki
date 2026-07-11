import {describe,expect,it} from 'vitest'
import {detectPlatform,normalizeUrl} from './import'
describe('importação',()=>{it('detecta plataformas',()=>{expect(detectPlatform('https://youtu.be/abc')).toBe('youtube');expect(detectPlatform('https://example.com/r')).toBe('blog')});it('remove rastreamento',()=>expect(normalizeUrl('HTTPS://Example.com/receita/?utm_source=x&gclid=y')).toBe('https://example.com/receita'))})
