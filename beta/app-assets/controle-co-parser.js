/* Identical source in GAS and preview browsers. Scene names are the source of truth. */
var VinciCO = (function () {
  function normalize(s){return String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();}
  var prefix=/^\s*C\.?\s?O\.?[\s_\-:]+(.+)$/i;
  var aliases={ligar:['ligar','liga','on'],desligar:['desligar','desliga','off'],mudo:['mudo','mute','silenciar','muda'], 'vol-':['vol-','vol -','volume -','volume menos','vol menos','abaixar volume','abaixa o volume','diminuir volume'], 'vol+':['vol+','vol +','volume +','volume mais','vol mais','aumentar volume','aumenta o volume'], 'canal-':['canal-','canal -','canal menos'], 'canal+':['canal+','canal +','canal mais'],pausar:['pausar','pausa','pause'],tocar:['tocar','play','continuar'],anterior:['anterior'],proxima:['proxima','proximo'],ok:['ok','confirmar'],cima:['cima'],baixo:['baixo'],esquerda:['esquerda'],direita:['direita'],voltar:['voltar'],inicio:['inicio','home','menu'],fonte:['fonte','input','entrada'],netflix:['netflix'],youtube:['youtube'],globoplay:['globoplay'],'temp-':['temp-','temp -','temperatura -','temp menos','temperatura menos'],'temp+':['temp+','temp +','temperatura +','temp mais','temperatura mais'],frio:['frio'],ventilar:['ventilar'],auto:['auto','automatico']};
  function canonical(s){var n=normalize(s), keys=Object.keys(aliases);for(var i=0;i<keys.length;i++)if(aliases[keys[i]].indexOf(n)>=0)return keys[i];return n;}
  function isCO(s){return prefix.test(String(s||''));}
  function parse(name,rooms){var m=String(name||'').match(prefix);if(!m)return null;var rest=m[1].trim(), tokens=rest.split(/\s+/), room=null;
    (rooms||[]).map(function(r){return typeof r==='string'?r:(r.nome||r.name||'');}).filter(Boolean).sort(function(a,b){return normalize(b).length-normalize(a).length;}).some(function(r){var rn=normalize(r),n=normalize(rest);if(n.endsWith(' '+rn)){room=r;tokens=rest.split(/\s+/).slice(0,-rn.split(' ').length);return true;}return false;});
    if(!room){var withoutDevice=rest.replace(/\b(Apple\s+TV|TV|Ar|Som|Projetor|Receiver)\b/i,'').replace(/\s+/g,' ').trim();if(Object.prototype.hasOwnProperty.call(aliases,canonical(withoutDevice))||tokens.length===1)room='Geral';else room=tokens.pop();}
    var body=tokens.join(' '),device=null, dm=body.match(/\b(Apple\s+TV|TV|Ar|Som|Projetor|Receiver)\b/i);
    if(dm){var d=normalize(dm[1]);device={'apple tv':'Apple TV',tv:'TV',ar:'Ar',som:'Som',projetor:'Projetor',receiver:'Receiver'}[d];body=(body.slice(0,dm.index)+' '+body.slice(dm.index+dm[0].length)).replace(/\s+/g,' ').trim();}
    var fn=canonical(body);if(!device)device=/^(temp[+-]|frio|ventilar|auto)$/.test(fn)?'Ar':/^(anterior|proxima|tocar)$/.test(fn)?'Som':'TV';
    return {ambiente:room,aparelho:device,funcao:fn,rotulo:Object.prototype.hasOwnProperty.call(aliases,fn)?body:rest,nome:String(name),custom:!Object.prototype.hasOwnProperty.call(aliases,fn)};
  }
  function group(scenes,rooms){var groups=[];(scenes||[]).forEach(function(s){var p=parse(s.nome||s.name||s.scene_name,rooms);if(!p)return;var g=groups.find(function(x){return normalize(x.ambiente)===normalize(p.ambiente)&&x.aparelho===p.aparelho;});if(!g){g={ambiente:p.ambiente,aparelho:p.aparelho,botoes:[]};groups.push(g);}g.botoes.push({funcao:p.funcao,rotulo:p.rotulo,cenaId:s.cenaId||s.id||s.scene_id,custom:p.custom});});return groups;}
  return {normalize:normalize,isCO:isCO,canonical:canonical,parse:parse,group:group};
})();
if(typeof module!=='undefined'&&module.exports)module.exports=VinciCO;
