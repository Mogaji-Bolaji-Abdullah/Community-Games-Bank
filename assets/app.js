(() => {
  'use strict';
  const REPO = 'https://github.com/Mogaji-Bolaji-Abdullah/Community-Games-Bank';
  const state = { games: [], filter: 'all', search: '' };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let revealObserver = null;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const esc = (str) => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = (tag, className, text) => { const node=document.createElement(tag); if(className) node.className=className; if(text!==undefined) node.textContent=text; return node; };

  function createCard(game) {
    const article = el('article', 'game-card reveal-target');
    const art=game.art||{};
    const theme=String(art.theme||'lime').replace(/[^a-z0-9-]/gi,'');
    const visual = el('div', `game-visual visual-${theme}`);
    visual.setAttribute('aria-hidden', 'true');
    visual.innerHTML = `<span class="little-sticker">${esc(art.sticker||'LET’S PLAY ↗')}</span><div class="charades-poster"><div class="poster-top">COMMUNITY GAMES BANK</div><div class="poster-stars">✳</div><div class="poster-word"><span class="poster-word-one">${esc(art.lineOne||'LET’S')}</span><br><em class="poster-word-two">${esc(art.lineTwo||'PLAY.')}</em></div><div class="poster-foot">GOOD GAMES. GREAT PEOPLE.</div></div>`;
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
    matches.forEach((g,i)=>{
      const card=createCard(g);
      card.style.setProperty('--reveal-delay',`${i*95}ms`);
      grid.append(card);
      if(revealObserver) revealObserver.observe(card);
      else card.classList.add('is-visible');
    });
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

  // Sections reveal on entry, not by hiding the site until JavaScript loads.
  function setupReveals(){
    if(reducedMotion.matches || !('IntersectionObserver' in window)) return;
    document.body.classList.add('motion-on');
    const selectors = [
      '.section-header > div','.library-count','.directory-tools','.roadmap-title',
      '.roadmap-card','.how-header > div','.how-header > p','.step',
      '.about-left','.about-right','.contribute-copy','.contrib-sticker',
      '.footer-top', '.game-card'
    ];
    const targets=$$(selectors.join(','));
    targets.forEach(node=>{
      node.classList.add('reveal-target');
      if(node.matches('.roadmap-card,.step')){
        const siblings=[...node.parentElement.children];
        node.style.setProperty('--reveal-delay',`${Math.min(siblings.indexOf(node),5)*125}ms`);
      }
    });
    revealObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          revealObserver.unobserve(entry.target);
        }
      });
    },{threshold:.08,rootMargin:'0px 0px -20px 0px'});
    targets.forEach(node=>revealObserver.observe(node));
    // If visitors jump via anchor links, reveal skipped content as well.
    let revealQueued=false;
    window.addEventListener('scroll',()=>{
      if(revealQueued)return;
      revealQueued=true;
      requestAnimationFrame(()=>{
        targets.forEach(node=>{
          if(!node.classList.contains('is-visible') && node.getBoundingClientRect().bottom<0){
            node.classList.add('is-visible');
            revealObserver.unobserve(node);
          }
        });
        revealQueued=false;
      });
    },{passive:true});
    requestAnimationFrame(()=>document.body.classList.add('hero-enter'));
  }

  // Animate sample *illustrations* only; never claim these are real team scores.
  const previewScenes=[
    {top:'ACT IT',bottom:'OUT!',round:'ROUND 01 · EASY & FUN',team:'TEAM SUNSHINE, YOU’RE UP!',score:'240',time:'45'},
    {top:'GUESS',bottom:'FAST!',round:'ROUND 02 · GET CREATIVE',team:'TEAM FIREWORKS, YOUR TURN!',score:'180',time:'35'},
    {top:'BEAT THE',bottom:'CLOCK!',round:'ROUND 03 · CULTURE CHECK',team:'TEAM SPARK, SHOW US!',score:'320',time:'20'},
    {top:'WIN THE',bottom:'CROWD!',round:'FINAL ROUND · BIG ENERGY',team:'TEAM VIBE, TAKE THE STAGE!',score:'480',time:'10'}
  ];
  const posterScenes=[
    {top:'ACT IT',bottom:'OUT!'},
    {top:'TEAM',bottom:'UP!'},
    {top:'GUESS',bottom:'FAST!'},
    {top:'GAME',bottom:'ON!'}
  ];
  let previewIndex=0,previewPaused=false,swapTimeout=null,posterTimeout=null;
  const windowCard=$('.mock-window'),dots=$$('#previewPips .preview-pip'),toggle=$('#previewToggle');

  function setPreview(index,animate=true){
    const scene=previewScenes[index];
    if(!scene||!windowCard)return;
    clearTimeout(swapTimeout);
    const commit=()=>{
      windowCard.classList.toggle('is-long',scene.top.length>=7);
      $('#previewWordTop').textContent=scene.top;
      $('#previewWordBottom').textContent=scene.bottom;
      $('.mock-play-label').textContent=scene.round;
      $('.mock-turn-label').textContent=scene.team;
      $('#previewScore').textContent=scene.score;
      const timer=$('.mock-timer');
      timer.querySelectorAll('span')[2].textContent=scene.time;
      windowCard.classList.remove('is-swapping');
    };
    if(animate&&!reducedMotion.matches){
      windowCard.classList.add('is-swapping');
      swapTimeout=window.setTimeout(commit,235);
    }else commit();
    previewIndex=index;
    dots.forEach((dot,i)=>{
      const selected=i===index;
      dot.classList.toggle('is-active',selected);
      dot.setAttribute('aria-pressed',String(selected));
    });
  }
  function rotatePoster(index){
    const card=$('.game-visual');
    if(!card)return;
    clearTimeout(posterTimeout);
    if(!card.querySelector('.poster-word-one'))return;
    const commit=()=>{
      card.querySelector('.poster-word-one').textContent=posterScenes[index].top;
      card.querySelector('.poster-word-two').textContent=posterScenes[index].bottom;
      card.classList.remove('is-swapping');
    };
    if(!reducedMotion.matches){
      card.classList.add('is-swapping');
      posterTimeout=window.setTimeout(commit,250);
    }else commit();
  }
  function syncPreviewButton(){
    toggle.setAttribute('aria-pressed',String(previewPaused));
    toggle.setAttribute('aria-label',previewPaused?'Resume game preview animations':'Pause game preview animations');
    toggle.innerHTML=previewPaused?'<span aria-hidden="true">▶</span> Play':'<span aria-hidden="true">Ⅱ</span> Pause';
  }
  function setupPreviews(){
    if(!windowCard||!toggle)return;
    if(reducedMotion.matches){
      previewPaused=true;
      syncPreviewButton();
      toggle.disabled=true;
      toggle.textContent='Motion off';
      toggle.setAttribute('aria-label','Automatic previews are off because reduced motion is enabled');
    }
    dots.forEach(dot=>dot.addEventListener('click',()=>setPreview(Number(dot.dataset.slide))));
    toggle.addEventListener('click',()=>{
      previewPaused=!previewPaused;
      syncPreviewButton();
    });
    window.setInterval(()=>{
      if(previewPaused||reducedMotion.matches||document.hidden||$('#suggestDialog').open)return;
      setPreview((previewIndex+1)%previewScenes.length);
      rotatePoster((previewIndex)%posterScenes.length);
    },4100);
  }
  function setupMarquee(){
    if(reducedMotion.matches)return;
    const inner=$('.marquee-inner');
    if(!inner)return;
    [...inner.children].forEach(child=>{
      const clone=child.cloneNode(true);
      clone.setAttribute('aria-hidden','true');
      inner.append(clone);
    });
    inner.classList.add('is-looping');
  }

  $('#year').textContent=new Date().getFullYear();
  setupReveals();
  setupMarquee();
  setupPreviews();
  loadGames();
})();