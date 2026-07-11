// @vitest-environment jsdom
import {beforeEach,describe,expect,it} from 'vitest'
import {getLocalRecipe,getLocalRecipes,saveLocalRecipe} from './local-store'
beforeEach(()=>localStorage.clear())
describe('modo local',()=>{it.each([['https://www.instagram.com/reel/abc','instagram'],['https://www.tiktok.com/@cozinha/video/123','tiktok']])('detecta %s e solicita revisão',(url,platform)=>{const recipe=saveLocalRecipe({sourceUrl:url});expect(recipe.source_platform).toBe(platform);expect(recipe.status).toBe('needs_review');expect(getLocalRecipe(recipe.id)?.source_url).toBe(url)});it('persiste receita manual sem consumir backend',()=>{saveLocalRecipe({title:'Bolo',description:'Receita de teste'});expect(getLocalRecipes()).toHaveLength(1);expect(getLocalRecipes()[0].status).toBe('ready')});it('bloqueia protocolo não web',()=>expect(()=>saveLocalRecipe({sourceUrl:'file:///etc/passwd'})).toThrow('Protocolo inválido'))})
