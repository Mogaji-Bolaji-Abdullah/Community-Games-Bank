(() => {
  'use strict';
  const REPO = 'https://github.com/Mogaji-Bolaji-Abdullah/Community-Games-Bank';
  const state = { games: [], filter: 'all', search: '' };
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (str) => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = (tag, className, text) => { const node=document.createElement(tag); if(className) node.className=className; if(text!==undefined) node.textContent=text; return node; };

  function createCard(game) {
    const article = el('article', 'game-card');
    const art=game.art||{};
    const theme=String(art.theme||'lime').replace(/[^a-z0-9-]/gi,'');
    const visual = el('div', `game-visual visual-${theme}`);
    visual.setAttribute('aria-hidden', 'true');
    visual.innerHTML = `<span class="little-sticker">${esc(art.sticker||'LET’S PLAY ↗')}</span><div class="charades-poster"><div class="poster-top">COMMUNITY GAMES BANK</div><div class="poster-stars">✳</div><div class="poster-word">${esc(art.lineOne||'LET’S')}<br><em>${esc(art.lineTwo||'PLAY.')}</em></div><div class="poster-foot">GOOD GAMES. GREAT PEOPLE.</div></div>`;
    const info = el('div','game-content');
    const top = el('div','game-topline');
    top.append(el('span','status-badge','PLAYABLE NOW'),el('span','game-category',game.category.toUpperCase()));
    const title = el('h3','',game.title);
    const description = el('p','',game.description);
    const meta = el('div','game-meta');
    game.details.forEach(detail => meta.append(el('span','',detail)));
    const actions = el('div','game-actions');
    const play = el('a','button button-dark button-large','Play the game →');
    play.href=game.href;
    play.setAttribute('aria-label',`Play ${game.title}`);
    const src=el('a','inline-source','View source ↗');
    src.href=game.sourceHref;src.target='_blank';src.rel='noopener noreferrer';
    actions.append(play,src);info.append(top,title,description,meta,actions);article.append(visual,info);
    return article;
  }

  function renderFilters() {
    const filterBox=$('#gameFilters');
    const categories=[...new Set(state.games.filter(g=>g.status==='live').flatMap(g=>g.tags))];
    filterBox.replaceChildren();
    const all=['All games',...categories];
    all.forEach((name,i)=>{
      const value=i===0?'all':name;
      const button=el('button',`filter-chip${state.filter===value?' active':''}`,name);
      button.type='button';button.dataset.filter=value;
      button.setAttribute('aria-pressed', String(state.filter===value));
      button.addEventListener('click',()=>{state.filter=value;renderFilters();renderGames();});
      filterBox.append(button);
    });
  }

  function renderGames() {
    const q=state.search.trim().toLowerCase();
    const matches=state.games.filter(g=>g.status==='live'&&(state.filter==='all'||g.tags.includes(state.filter))&&(!q||[g.title,g.description,g.category,...g.tags,...g.searchTerms,...g.details].join(' ').toLowerCase().includes(q)));
    const grid=$('#gamesGrid');grid.replaceChildren();
    matches.forEach(g=>grid.append(createCard(g)));
    $('#emptyState').hidden=matches.length>0;
  }

  async function loadGames() {
    try {
      const response=await fetch('/data/games.json',{cache:'no-store'});
      if(!response.ok) throw new Error(`HTTP ${response.status}`);
      const games=await response.json();
      if(!Array.isArray(games)) throw new Error('Bad catalogue');
      state.games=games;
      const live=games.filter(g=>g.status==='live').length;
      $('#liveCount').textContent=String(live).padStart(2,'0');
      renderFilters();renderGames();
    } catch(err) {
      const grid=$('#gamesGrid');grid.replaceChildren();
      const msg=el('div','empty-state');
      msg.innerHTML='<h3>Game library unavailable</h3><p>We couldn’t load the catalogue. You can still play Charades directly.</p><a href="/games/iih-charades/" class="button button-dark">Open Charades Club ↗</a>';
      grid.append(msg);
      $('#emptyState').hidden=true;
      console.error('Could not load game directory',err);
    }
  }

  function suggestIssue(title,description,context='') {
    const body=[
      '## Game idea',title,
      '', '## Best for',context||'Community events and group activities',
      '', '## How to play',description||'I would love to see this game added to the Community Games Bank.',
      '', '## Additional notes','I am happy to discuss the idea with the community.'
    ].join('\n');
    return `${REPO}/issues/new?title=${encodeURIComponent(`Game suggestion: ${title}`)}&body=${encodeURIComponent(body)}`;
  }

  const dialog=$('#suggestDialog');
  const form=$('#suggestForm');
  function openSuggest(prefill='') {
    form.reset();
    if(prefill) $('#ideaName').value=prefill;
    dialog.showModal();document.body.classList.add('dialog-open');
    $('#ideaName').focus();
  }
  function closeSuggest() {dialog.close();document.body.classList.remove('dialog-open');}
  $$('[data-open-suggest]').forEach(btn=>btn.addEventListener('click',()=>openSuggest()));
  $$('[data-request]').forEach(btn=>btn.addEventListener('click',()=>openSuggest(btn.dataset.request)));
  $('#closeDialog').addEventListener('click',closeSuggest);
  dialog.addEventListener('close',()=>document.body.classList.remove('dialog-open'));
  dialog.addEventListener('click',(event)=>{if(event.target===dialog)closeSuggest();});
  form.addEventListener('submit',(event)=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const name=$('#ideaName').value.trim(),desc=$('#ideaDescription').value.trim(),context=$('#ideaUse').value;
    if(!name||!desc||!context)return;
    const url=suggestIssue(name,desc,context);
    closeSuggest();
    window.location.assign(url);
  });

  const menu=$('#menuToggle'),mobile=$('#mobileNav');
  function setMenu(open){menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'Close navigation':'Open navigation');mobile.hidden=!open;}
  menu.addEventListener('click',()=>setMenu(mobile.hidden));
  $$('#mobileNav a').forEach(link=>link.addEventListener('click',()=>setMenu(false)));
  document.addEventListener('keydown',(event)=>{if(event.key==='Escape'&&!mobile.hidden)setMenu(false);});
  $('#gameSearch').addEventListener('input',event=>{state.search=event.target.value;renderGames();});
  $('#clearFilters').addEventListener('click',()=>{state.search='';state.filter='all';$('#gameSearch').value='';renderFilters();renderGames();});
  $('#year').textContent=new Date().getFullYear();
  loadGames();
})();
