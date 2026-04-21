const ZONAS=['ZONA BUFFER EHA','ZONA BUFFER EHA VOLUMOSO','ZONA COP','ZONA LMH','ZONA VOLUMOSO','ZONA LINEAR'];
const ZONA_COLORS={'ZONA BUFFER EHA':'#00d4ff','ZONA BUFFER EHA VOLUMOSO':'#ff6b2b','ZONA COP':'#00e676','ZONA LMH':'#ffd600','ZONA VOLUMOSO':'#b388ff','ZONA LINEAR':'#ff4081'};
const TURNO_HORARIO={'1':{label:'Turno 1 (06h–14h)',horas:['06','07','08','09','10','11','12','13']},'2':{label:'Turno 2 (14h–22h)',horas:['14','15','16','17','18','19','20','21']},'3':{label:'Turno 3 (22h–06h)',horas:['22','23','00','01','02','03','04','05']}};
let rawData=[],filteredData=[],backlogData=[],charts={},zonaCharts={},gasUrl='';

// Registra o plugin de datalabels após carregar
if(typeof ChartDataLabels !== 'undefined'){
  Chart.register(ChartDataLabels);
  console.log('✅ Plugin ChartDataLabels registrado');
} else {
  console.warn('⚠️ Plugin ChartDataLabels não encontrado');
}


function gasJsonp(url) {
  return new Promise((resolve, reject) => {
    const cbName = 'cb_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
    const script = document.createElement('script');
    const timer = setTimeout(() => { 
      cleanup(); 
      console.warn('⚠️ JSONP timeout, tentando fetch direto...');
      // Fallback: tenta fetch direto
      fetchDirect(url).then(resolve).catch(reject);
    }, 10000);
    
    function cleanup() { 
      clearTimeout(timer); 
      delete window[cbName]; 
      if (script.parentNode) script.parentNode.removeChild(script); 
    }
    
    window[cbName] = (data) => { cleanup(); resolve(data); };
    
    script.onerror = () => { 
      cleanup(); 
      console.warn('⚠️ JSONP falhou, tentando fetch direto...');
      // Fallback: tenta fetch direto
      fetchDirect(url).then(resolve).catch(reject);
    };
    
    // Adiciona o separador correto (? ou &) dependendo se já tem parâmetros
    const separator = url.includes('?') ? '&' : '?';
    script.src = url + separator + 'callback=' + cbName;
    document.head.appendChild(script);
  });
}

// Fallback: fetch direto (pode funcionar se o GAS permitir CORS)
async function fetchDirect(url) {
  console.log('🔄 Tentando fetch direto (sem JSONP)...');
  try {
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'follow'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Fetch direto funcionou!', data);
    return data;
  } catch (err) {
    console.error('❌ Fetch direto também falhou:', err);
    throw new Error('Não foi possível conectar ao Google Apps Script. Verifique se o Web App está publicado como "Qualquer pessoa" e se a URL está correta.');
  }
}

async function fetchData(){
  if(!gasUrl)return;
  const btn=document.getElementById('btnRefresh');
  btn.disabled=true;btn.textContent='⟳ Buscando...';
  showLoader('Conectando ao Apps Script...');
  console.log('🔗 Tentando conectar:', gasUrl);
  console.log('🌐 Origem:', window.location.origin);
  console.log('📍 Protocolo:', window.location.protocol);
  
  try{
    console.log('📡 Requisição 1: lastUpdate');
    const j1 = await gasJsonp(gasUrl + '?action=lastUpdate');
    console.log('✅ Resposta lastUpdate:', j1);
    document.getElementById('lastUpdate').textContent = j1.lastUpdate || '—';
    setLoaderMsg('Carregando registros...');
    console.log('📡 Requisição 2: all data');
    const j2 = await gasJsonp(gasUrl + '?action=all');
    console.log('✅ Resposta all data:', j2);
    if(j2.error) throw new Error(j2.error);
    if(!j2.rows||!j2.rows.length) throw new Error('Planilha sem dados ou aba não encontrada.');
    rawData=j2.rows;
    // Usa ultima_atualizacao_tabela da planilha para indicar quando os dados foram gerados
    const ucol=rawData.length?Object.keys(rawData[0]).find(k=>k.includes('ultima_atualizacao')):null;
    if(ucol){
      const latestUpdate=rawData.map(r=>r[ucol]).filter(Boolean).sort().pop();
      if(latestUpdate) document.getElementById('lastUpdate').textContent=latestUpdate;
    }
    detectZoneOptions();detectDateRange();applyFilters();
    fetchBacklog();
  }catch(err){
    console.error('❌ Erro detalhado:', err);
    console.error('📋 Stack:', err.stack);
    
    // Se o erro for de CORS/JSONP, sugere usar via servidor
    if(err.message.includes('carregar script') || err.message.includes('CORS')) {
      setStatus('err','Erro de CORS: Abra via servidor HTTP (não file://). Veja console para detalhes.');
      console.error('');
      console.error('🔧 SOLUÇÃO:');
      console.error('   O dashboard precisa ser servido via HTTP, não file://');
      console.error('   Execute: python -m http.server 8080');
      console.error('   Depois acesse: http://localhost:8080/dashboard_operacional.html');
      console.error('');
    } else {
      setStatus('err','Erro: '+err.message);
    }
  }
  finally{hideLoader();btn.disabled=false;btn.textContent='⟳ Atualizar';}
}

function detectZoneOptions(){
  const zc=findCol(['group_name','zona','zone']);
  const zs=[...new Set(rawData.map(r=>String(r[zc]||'').trim()).filter(Boolean))].sort();
  const sel=document.getElementById('filterZona');
  const prev=sel.value;
  sel.innerHTML='<option value="">Todas</option>';
  zs.forEach(z=>{const o=document.createElement('option');o.value=z;o.textContent=z;sel.appendChild(o);});
  if(prev&&zs.includes(prev))sel.value=prev;
}


function detectDateRange(){
  const dc=findCol(['adjusted_date','data','date','timestamp']);
  const dates = rawData.map(r=>{
    const rd = r[dc];
    if(!rd) return null;
    
    // Tenta parsear a data
    let recordDate;
    if(typeof rd === 'string'){
      const parts = rd.split(/[\/\s:]/);
      if(parts.length >= 3 && parts[0].length <= 2){
        // Formato brasileiro: DD/MM/YYYY
        recordDate = new Date(parts[2], parts[1]-1, parts[0]);
      } else {
        recordDate = new Date(rd);
      }
    } else {
      recordDate = new Date(rd);
    }
    
    return isNaN(recordDate.getTime()) ? null : recordDate;
  }).filter(Boolean);
  
  if(dates.length > 0){
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Formata para YYYY-MM-DD (formato do input date)
    const formatDate = d => d.toISOString().split('T')[0];
    
    // Define apenas os limites (min/max) mas NÃO preenche o valor
    const inputData = document.getElementById('filterData');
    
    inputData.min = formatDate(minDate);
    inputData.max = formatDate(maxDate);
    
    // Define placeholder para orientar o usuário
    inputData.placeholder = `${formatDate(minDate)} a ${formatDate(maxDate)}`;
    
    // NÃO define valor padrão - deixa vazio para mostrar todos os dados
    
    console.log('📅 Período disponível:', formatDate(minDate), 'até', formatDate(maxDate));
    console.log('💡 Filtro de data vazio - mostrando todos os dados');
    
    // Atualiza a barra de status com informação do período
    const statusText = document.getElementById('statusText');
    if(statusText && statusText.textContent.includes('registros')){
      const currentText = statusText.textContent;
      statusText.textContent = currentText + ` | Período: ${formatDate(minDate)} a ${formatDate(maxDate)}`;
    }
  }
}

function findCol(candidates){
  const keys=rawData.length?Object.keys(rawData[0]):[];
  for(const c of candidates){const f=keys.find(k=>k.includes(c));if(f)return f;}
  return candidates[0];
}

// Função auxiliar para extrair hora de diferentes formatos
function extractHour(horaValue){
  const horaStr = String(horaValue||'');
  // Formato: "DD/MM/YYYY HH:MM:SS" ou "YYYY-MM-DD HH:MM:SS"
  if(horaStr.includes(' ')){
    const parts = horaStr.split(' ');
    if(parts.length >= 2){
      return parts[1].substring(0,2); // Pega HH de HH:MM:SS
    }
  }
  // Formato: "HH:MM:SS" ou "HH:MM"
  if(horaStr.includes(':')){
    return horaStr.substring(0,2);
  }
  // Formato: "HH" ou outros
  return horaStr.substring(0,2);
}

function applyFilters(){
  const turno=document.getElementById('filterTurno').value;
  const zona=document.getElementById('filterZona').value;
  const dataSelecionada=document.getElementById('filterData').value;

  const zc=findCol(['group_name','zona','zone']);
  const tc=findCol(['turno']);
  // Prioriza adjusted_date como fonte de verdade da data do turno
  const adc=findCol(['adjusted_date']);
  const dc=findCol(['adjusted_date','data','date','timestamp']);
  
  // Converte data para comparação
  const dtSelecionada = dataSelecionada ? new Date(dataSelecionada) : null;
  
  // Mostra/oculta indicador de filtro ativo
  const indicator = document.getElementById('dateFilterIndicator');
  if(indicator){
    indicator.style.display = dataSelecionada ? 'inline' : 'none';
  }

  // Função auxiliar: parseia data no formato "DD/MM/YYYY ..." ou ISO
  function parseRecordDate(rd){
    if(!rd) return null;
    if(typeof rd === 'string'){
      const parts = rd.split(/[\/\s:]/);
      if(parts.length >= 3 && parts[0].length <= 2){
        // Formato brasileiro DD/MM/YYYY
        const d = new Date(parts[2], parts[1]-1, parts[0]);
        return isNaN(d.getTime()) ? null : d;
      }
      const d = new Date(rd);
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(rd);
    return isNaN(d.getTime()) ? null : d;
  }
  
  filteredData=rawData.filter(r=>{
    const rz=String(r[zc]||'').trim().toUpperCase();

    // Filtro de turno: extrai só o dígito para aceitar "1", "Turno 1", "T1", etc.
    if(turno&&String(r[tc]||'').replace(/\D/g,'').charAt(0)!==turno)return false;

    // Filtro de zona
    if(zona&&rz!==zona.trim().toUpperCase())return false;
    
    // Filtro de data: usa adjusted_date como referência do turno
    if(dtSelecionada){
      // Usa adjusted_date se disponível, senão cai para coluna de data genérica
      const rd = (adc && r[adc]) ? r[adc] : r[dc];
      if(!rd) return false;
      
      const recordDate = parseRecordDate(rd);
      if(!recordDate){
        console.warn('⚠️ Data inválida encontrada:', rd);
        return false;
      }
      
      // Compara apenas a data (ignora hora) — adjusted_date já representa o dia do turno
      const recordDateStr = `${recordDate.getFullYear()}-${String(recordDate.getMonth()+1).padStart(2,'0')}-${String(recordDate.getDate()).padStart(2,'0')}`;
      const selectedDateStr = dtSelecionada.toISOString().split('T')[0];
      
      if(recordDateStr !== selectedDateStr) return false;
    }
    
    return true;
  });
  
  renderDashboard();
  
  // Log para debug
  const filtrosAtivos = [];
  if(turno) filtrosAtivos.push(`Turno ${turno}`);
  if(zona) filtrosAtivos.push(`Zona: ${zona}`);
  if(dataSelecionada) filtrosAtivos.push(`Data: ${dataSelecionada}`);

  console.log('📊 Filtros aplicados:', {
    turno, zona, data: dataSelecionada,
    registrosOriginais: rawData.length,
    registrosFiltrados: filteredData.length,
    filtrosAtivos: filtrosAtivos.length > 0 ? filtrosAtivos.join(', ') : 'Nenhum'
  });
  
  // Aviso se filtro de data estiver ativo
  if(dataSelecionada){
    console.warn('⚠️ FILTRO DE DATA ATIVO - Mostrando apenas dados de ' + dataSelecionada);
    console.log('💡 Para ver todos os dados, clique no botão ✕ ao lado da data');
  }
}

function clearDateFilters(){
  document.getElementById('filterData').value = '';
  const indicator = document.getElementById('dateFilterIndicator');
  if(indicator) indicator.style.display = 'none';
  applyFilters();
  console.log('🗑️ Filtro de data limpo - mostrando todos os dados');
}

function renderDashboard(){renderKPIs();renderConsolidadoChart();renderFifoChart();renderZonasChart();renderTurnoTable();renderZonaCards();renderBacklog();}

async function fetchBacklog(){
  if(!gasUrl)return;
  try{
    const j=await fetchDirect(gasUrl+'?action=backlog');
    if(j.error)throw new Error('GAS retornou erro: '+j.error);
    if(j&&j.rows&&j.rows.length){backlogData=j.rows;renderBacklog();console.log('✅ Backlog:',backlogData.length,'registros');}
    else console.warn('⚠️ Backlog: aba existe mas está vazia (total='+j.total+')');
  }catch(err){console.error('❌ Backlog falhou:',err.message);}
}

function renderBacklog(){
  const container=document.getElementById('backlogContainer');
  const title=document.getElementById('backlogTitle');
  if(!container)return;
  if(!backlogData.length){
    container.innerHTML='';
    if(title)title.style.display='none';
    return;
  }
  if(title)title.style.display='';

  const palette=['#00d4ff','#ff6b2b','#00e676','#ffd600','#b388ff','#ff4081','#40c4ff','#69f0ae'];

  // Formata horas decimais → "8h 13m" / "1d 4h"
  function fmtH(h){
    if(!h||isNaN(h))return'—';
    if(h<1)return Math.round(h*60)+'m';
    if(h<24){const hh=Math.floor(h),mm=Math.round((h-hh)*60);return mm?`${hh}h ${mm}m`:`${hh}h`;}
    const d=Math.floor(h/24),rh=Math.floor(h%24);return rh?`${d}d ${rh}h`:`${d}d`;
  }

  // Ordena aging clusters: extrai primeiro número e converte para horas
  // Detecta "dia/dias/day" para multiplicar por 24
  function clusterOrder(c){
    const s=String(c).toLowerCase();
    const isDays=s.includes('dia')||s.includes('day');
    const m=s.match(/(\d+(?:\.\d+)?)/);
    if(!m)return 9999;
    return parseFloat(m[1])*(isDays?24:1);
  }

  // Agrupa por zona e aging_cluster
  const byZona={};
  const clusterSet=new Set();
  backlogData.forEach(r=>{
    const z=String(r['group_name']||'').trim();
    if(!z)return;
    if(!byZona[z])byZona[z]={total:0,tos:new Set(),agingList:[],byCluster:{}};
    const packs=parseFloat(r['num_packs_in_staging'])||0;
    byZona[z].total+=packs;
    if(r['staging_area_name'])byZona[z].tos.add(r['staging_area_name']);
    const ah=parseFloat(r['aging_hours']);
    if(!isNaN(ah)&&ah>=0)byZona[z].agingList.push(ah);
    const cl=String(r['aging_cluster']||'').trim();
    if(cl){
      clusterSet.add(cl);
      byZona[z].byCluster[cl]=(byZona[z].byCluster[cl]||0)+packs;
    }
  });

  const zones=Object.keys(byZona).sort();
  const clusters=[...clusterSet].sort((a,b)=>clusterOrder(a)-clusterOrder(b));
  const lastUpd=backlogData.map(r=>r['last_update']).filter(Boolean).sort().pop()||'—';

  // ── CARDS POR ZONA ──────────────────────────────────────────────
  let cardsHtml='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px">';
  zones.forEach((zona,i)=>{
    const b=byZona[zona];
    const color=ZONA_COLORS[zona]||ZONA_COLORS[zona.toUpperCase()]||palette[i%palette.length];
    const avg=b.agingList.length?b.agingList.reduce((s,v)=>s+v,0)/b.agingList.length:0;
    const peak=b.agingList.length?Math.max(...b.agingList):0;
    const short=zona.replace(/^ZONA /i,'');
    cardsHtml+=`<div style="background:var(--surface);border:1px solid ${color}40;border-top:3px solid ${color};border-radius:10px;padding:16px 20px">
      <div style="font-family:'Rajdhani',sans-serif;font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${color};margin-bottom:6px">${short}</div>
      <div style="font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:700;color:${color};line-height:1;margin-bottom:4px">${Math.round(b.total).toLocaleString('pt-BR')}</div>
      <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px">pacotes &nbsp;·&nbsp; ${b.tos.size} TOs</div>
      <div style="display:flex;gap:20px">
        <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">avg</div><div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:${color}">${fmtH(avg)}</div></div>
        <div><div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:2px">pico</div><div style="font-family:'JetBrains Mono',monospace;font-size:13px;color:var(--red)">${fmtH(peak)}</div></div>
      </div>
    </div>`;
  });
  cardsHtml+='</div>';

  // ── TABELA POR FAIXA DE AGING ───────────────────────────────────
  let thead=`<tr><th>Faixa Aging</th>`;
  zones.forEach((zona,i)=>{
    const color=ZONA_COLORS[zona]||ZONA_COLORS[zona.toUpperCase()]||palette[i%palette.length];
    const short=zona.replace(/^ZONA /i,'');
    thead+=`<th style="color:${color}">${short}<div style="font-size:10px;font-family:'JetBrains Mono',monospace;color:var(--text-muted);font-weight:400">${Math.round(byZona[zona].total).toLocaleString('pt-BR')} pcts</div></th>`;
  });
  thead+=`<th>Total</th></tr>`;

  let tbody='';
  clusters.forEach(cl=>{
    let rowTotal=0;
    let cells=`<td style="color:#e2e8f0;font-weight:600">${cl}</td>`;
    zones.forEach((zona,i)=>{
      const color=ZONA_COLORS[zona]||ZONA_COLORS[zona.toUpperCase()]||palette[i%palette.length];
      const val=byZona[zona].byCluster[cl]||0;
      rowTotal+=val;
      cells+=val>0
        ?`<td class="td-num"><span style="background:${color}22;color:${color};border:1px solid ${color}55;padding:2px 12px;border-radius:4px;font-family:'JetBrains Mono',monospace;font-size:13px">${Math.round(val).toLocaleString('pt-BR')}</span></td>`
        :`<td class="td-num" style="color:var(--text-muted)">—</td>`;
    });
    cells+=rowTotal>0?`<td class="td-num td-cyan" style="font-weight:700">${Math.round(rowTotal).toLocaleString('pt-BR')}</td>`:`<td class="td-num" style="color:var(--text-muted)">—</td>`;
    tbody+=`<tr>${cells}</tr>`;
  });

  // Linha de total
  let totCells=`<td style="color:var(--text);font-weight:700">Total</td>`;
  let grand=0;
  zones.forEach((zona,i)=>{
    const color=ZONA_COLORS[zona]||ZONA_COLORS[zona.toUpperCase()]||palette[i%palette.length];
    const val=byZona[zona].total;grand+=val;
    totCells+=`<td class="td-num" style="color:${color};font-weight:700">${Math.round(val).toLocaleString('pt-BR')}</td>`;
  });
  totCells+=`<td class="td-num td-cyan" style="font-weight:700">${Math.round(grand).toLocaleString('pt-BR')}</td>`;
  tbody+=`<tr style="border-top:2px solid var(--border2)">${totCells}</tr>`;

  const tableHtml=`<div class="table-card"><div class="table-header" style="display:flex;align-items:center;justify-content:space-between"><span class="chart-title">Distribuição por Faixa de Aging</span><span style="font-size:11px;color:var(--text-muted)">Atualizado: ${lastUpd}</span></div><div style="overflow-x:auto"><table><thead>${thead}</thead><tbody>${tbody}</tbody></table></div></div>`;

  container.innerHTML=cardsHtml+tableHtml;
}

function sumField(data,cands){const c=findCol(cands);return data.reduce((s,r)=>s+(parseFloat(r[c])||0),0);}
function groupByHora(data){const hc=findCol(['hora','hour','horario']);const g={};data.forEach(r=>{const h=extractHour(r[hc]);if(!g[h])g[h]=[];g[h].push(r);});return g;}
function fmt(n){return n>=1000?(n/1000).toFixed(1)+'k':String(Math.round(n));}
function destroyChart(id){if(charts[id]){charts[id].destroy();delete charts[id];}}

function renderKPIs(){
  const atr=sumField(filteredData,['total_tos_atreladas','tos_atreladas','atreladas']);
  const des=sumField(filteredData,['total_tos_desatreladas','tos_desatreladas','desatreladas']);
  document.getElementById('kpiAtr').textContent=fmt(atr);
  document.getElementById('kpiDes').textContent=fmt(des);
}

function renderConsolidadoChart(){
  const bh=groupByHora(filteredData);const hrs=Object.keys(bh).sort();
  destroyChart('chartConsolidado');
  charts['chartConsolidado']=new Chart(document.getElementById('chartConsolidado'),{type:'bar',data:{labels:hrs.map(h=>h+':00'),datasets:[{label:'Atreladas',data:hrs.map(h=>sumField(bh[h],['total_tos_atreladas','tos_atreladas','atreladas'])),backgroundColor:'rgba(0,212,255,.7)',borderColor:'#00d4ff',borderWidth:1,borderRadius:4},{label:'Desatreladas',data:hrs.map(h=>sumField(bh[h],['total_tos_desatreladas','tos_desatreladas','desatreladas'])),backgroundColor:'rgba(255,107,43,.7)',borderColor:'#ff6b2b',borderWidth:1,borderRadius:4}]},options:chartOpts()});
}

function renderFifoChart(){
  const ok=sumField(filteredData,['fifo_respected','fifo_ok','fifo_sim'])||0;
  const nok=sumField(filteredData,['fifo_not_respected','fifo_nok','fifo_nao'])||0;
  destroyChart('chartFifo');
  charts['chartFifo']=new Chart(document.getElementById('chartFifo'),{
    type:'doughnut',
    data:{
      labels:['FIFO Respeitado','FIFO Violado'],
      datasets:[{
        data:[ok,nok],
        backgroundColor:['rgba(0,230,118,.8)','rgba(255,61,90,.8)'],
        borderColor:['#00e676','#ff3d5a'],
        borderWidth:2,
        hoverOffset:8
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        legend:{
          position:'bottom',
          labels:{color:'#94a3b8',font:{size:11,family:'Inter'},padding:16}
        },
        tooltip:{
          callbacks:{label:ctx=>` ${ctx.label}: ${ctx.raw}`}
        },
        datalabels:{
          display:true,
          color:'#fff',
          font:{size:14,weight:'bold',family:'JetBrains Mono'},
          formatter:(value,ctx)=>{
            const total = ctx.chart.data.datasets[0].data.reduce((a,b)=>a+b,0);
            const percent = ((value/total)*100).toFixed(1);
            return value > 0 ? `${value}\n(${percent}%)` : '';
          }
        }
      },
      cutout:'62%'
    }
  });
}

function renderZonasChart(){
  const zc=findCol(['group_name','zona','zone']);
  const palette=['#00d4ff','#ff6b2b','#00e676','#ffd600','#b388ff','#ff4081','#40c4ff','#69f0ae','#ffab40','#ea80fc'];
  const dataZones=[...new Set(filteredData.map(r=>String(r[zc]||'').trim()).filter(Boolean))].sort();
  const colors=dataZones.map((z,i)=>ZONA_COLORS[z]||ZONA_COLORS[z.toUpperCase()]||palette[i%palette.length]);
  destroyChart('chartZonas');
  charts['chartZonas']=new Chart(document.getElementById('chartZonas'),{type:'bar',data:{labels:dataZones.map(z=>z.replace(/^ZONA /i,'')),datasets:[{label:'Atreladas',data:dataZones.map(z=>sumField(filteredData.filter(r=>String(r[zc]||'').trim()===z),['total_tos_atreladas','tos_atreladas','atreladas'])),backgroundColor:colors.map(c=>c+'bb'),borderColor:colors,borderWidth:1,borderRadius:4}]},options:{...chartOpts(),indexAxis:'y'}});
}

function renderTurnoTable(){
  const tc=findCol(['turno']);
  const body=document.getElementById('turnoTableBody');body.innerHTML='';let any=false;
  Object.entries(TURNO_HORARIO).forEach(([t,info])=>{
    const rows=filteredData.filter(r=>String(r[tc]||'').replace(/\D/g,'').charAt(0)===t);
    if(!rows.length)return;any=true;
    const atr=sumField(rows,['total_tos_atreladas','tos_atreladas','atreladas']);
    const des=sumField(rows,['total_tos_desatreladas','tos_desatreladas','desatreladas']);
    const fok=sumField(rows,['fifo_respected','fifo_ok']);
    const fnok=sumField(rows,['fifo_not_respected','fifo_nok']);
    const tr=document.createElement('tr');
    tr.innerHTML=`<td><span class="turno-badge turno-${t}">${info.label}</span></td><td class="td-num td-cyan">${atr.toLocaleString('pt-BR')}</td><td class="td-num td-orange">${des.toLocaleString('pt-BR')}</td><td class="td-num td-green">${fok.toLocaleString('pt-BR')}</td><td class="td-num" style="color:var(--red)">${fnok.toLocaleString('pt-BR')}</td>`;
    body.appendChild(tr);
  });
  if(!any)body.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--text-muted);padding:24px">Sem dados para os filtros selecionados.</td></tr>';
}

function renderZonaCards(){
  const container=document.getElementById('zonasGrid');container.innerHTML='';
  const zf=document.getElementById('filterZona').value;
  const zc=findCol(['group_name','zona','zone']);
  const palette=['#00d4ff','#ff6b2b','#00e676','#ffd600','#b388ff','#ff4081','#40c4ff','#69f0ae','#ffab40','#ea80fc'];
  const dataZones=[...new Set(filteredData.map(r=>String(r[zc]||'').trim()).filter(Boolean))].sort();
  const vis=zf?[zf]:dataZones;
  vis.forEach((zona,i)=>{
    const rows=filteredData.filter(r=>String(r[zc]||'').trim()===zona);
    const atr=sumField(rows,['total_tos_atreladas','tos_atreladas','atreladas']);
    const des=sumField(rows,['total_tos_desatreladas','tos_desatreladas','desatreladas']);
    const color=ZONA_COLORS[zona]||ZONA_COLORS[zona.toUpperCase()]||palette[i%palette.length];
    const cid='zc_'+zona.replace(/ /g,'_');
    const card=document.createElement('div');card.className='zona-card';
    card.innerHTML=`<div class="zona-header" style="border-top:3px solid ${color}"><span class="zona-name" style="color:${color}">${zona}</span><div class="zona-stats"><div class="zona-stat"><div class="sv" style="color:${color}">${atr.toLocaleString('pt-BR')}</div><div class="sl">Atreladas</div></div><div class="zona-stat"><div class="sv" style="color:#ff6b2b">${des.toLocaleString('pt-BR')}</div><div class="sl">Desatreladas</div></div></div></div><div class="zona-chart"><canvas id="${cid}"></canvas></div>`;
    container.appendChild(card);
    setTimeout(()=>{
      if(zonaCharts[cid]){zonaCharts[cid].destroy();}
      const ctx=document.getElementById(cid);if(!ctx)return;
      const bh=groupByHora(rows);const hrs=Object.keys(bh).sort();
      zonaCharts[cid]=new Chart(ctx,{type:'line',data:{labels:hrs.map(h=>h+':00'),datasets:[{label:'Atreladas',data:hrs.map(h=>sumField(bh[h],['total_tos_atreladas','tos_atreladas','atreladas'])),borderColor:color,backgroundColor:color+'20',fill:true,tension:.4,pointRadius:3,borderWidth:2},{label:'Desatreladas',data:hrs.map(h=>sumField(bh[h],['total_tos_desatreladas','tos_desatreladas','desatreladas'])),borderColor:'#ff6b2b',backgroundColor:'rgba(255,107,43,.1)',fill:true,tension:.4,pointRadius:3,borderWidth:2}]},options:chartOpts(true)});
    },50);
  });
}

function chartOpts(compact=false){
  return{
    responsive:true,
    maintainAspectRatio:false,
    plugins:{
      legend:{
        position:'top',
        labels:{
          color:'#94a3b8',
          font:{size:compact?10:11,family:'Inter'},
          padding:compact?10:16,
          boxWidth:12
        }
      },
      tooltip:{
        backgroundColor:'#0d1320',
        borderColor:'#1e2d45',
        borderWidth:1,
        titleColor:'#e2e8f0',
        bodyColor:'#94a3b8',
        padding:10
      },
      datalabels:{
        display:true,
        color:'#e2e8f0',
        font:{
          size:compact?9:10,
          weight:'bold',
          family:'JetBrains Mono'
        },
        anchor:'end',
        align:'top',
        offset:2,
        formatter:(value)=>{
          // Formata números grandes
          if(value >= 1000) return (value/1000).toFixed(1)+'k';
          return value > 0 ? value : '';
        }
      }
    },
    scales:{
      x:{
        grid:{color:'rgba(30,45,69,.5)'},
        ticks:{color:'#64748b',font:{size:compact?9:10,family:'JetBrains Mono'}}
      },
      y:{
        grid:{color:'rgba(30,45,69,.5)'},
        ticks:{color:'#64748b',font:{size:compact?9:10,family:'JetBrains Mono'}}
      }
    }
  };
}

function setStatus(type,msg){const bar=document.getElementById('statusBar'),text=document.getElementById('statusText');bar.className='status-bar';if(type==='ok')bar.classList.add('status-ok');if(type==='err')bar.classList.add('status-err');if(type==='load')bar.classList.add('status-load');bar.querySelector('span').textContent=type==='load'?'⟳':'⬤';text.textContent=msg;}
function showLoader(msg){document.getElementById('loaderMsg').textContent=msg;document.getElementById('loader').classList.add('active');}
function setLoaderMsg(msg){document.getElementById('loaderMsg').textContent=msg;}
function hideLoader(){document.getElementById('loader').classList.remove('active');}

function loadDemo(){
  document.getElementById('lastUpdate').textContent=new Date().toLocaleString('pt-BR');
  showLoader('Gerando dados de demonstração...');
  setTimeout(()=>{
    const horas=['06','07','08','09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
    rawData=[];
    
    // Gera dados para os últimos 7 dias
    const hoje = new Date();
    for(let d = 6; d >= 0; d--){
      const data = new Date(hoje);
      data.setDate(hoje.getDate() - d);
      const dataStr = data.toLocaleDateString('pt-BR') + ' 00:00:00';
      
      ZONAS.forEach(zona=>{
        horas.forEach(hora=>{
          const b=Math.floor(Math.random()*80)+20;
          rawData.push({
            adjusted_date: dataStr,
            group_name:zona,
            hora:hora+':00',
            total_tos_atreladas:b+Math.floor(Math.random()*30),
            total_tos_desatreladas:Math.max(0,b-Math.floor(Math.random()*20)),
            total_pacotes:b*(Math.floor(Math.random()*3)+2),
            posicoes_por_zona:Math.floor(Math.random()*50)+10,
            fifo_respected:Math.floor(Math.random()*60)+20,
            fifo_not_respected:Math.floor(Math.random()*15)
          });
        });
      });
    }
    
    detectZoneOptions();detectDateRange();applyFilters();
    setStatus('ok',`Demo: ${rawData.length} registros simulados (últimos 7 dias)`);hideLoader();
  },700);
}

window.addEventListener('load',()=>{
  gasUrl = GAS_URL;
  fetchData();
  setInterval(()=>{if(gasUrl)fetchData();},5*60*1000);
});
