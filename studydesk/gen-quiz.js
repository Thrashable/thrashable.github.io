// Reusable quiz-artifact generator.
// Usage: node gen-quiz.js <outfile> <title> <questionId> [questionId...]
// Reads question-bank.json from this directory and emits a self-contained HTML quiz.

const fs = require('fs');
const path = require('path');

const [outFile, quizTitle, ...ids] = process.argv.slice(2);
if (!outFile || !quizTitle || !ids.length) {
  console.error('Usage: node gen-quiz.js <outfile> <title> <questionId...>');
  process.exit(1);
}

const bank = JSON.parse(fs.readFileSync(path.join(__dirname, 'question-bank.json'), 'utf8'));
const byId = Object.fromEntries(bank.questions.map(q => [q.id, q]));
const missing = ids.filter(id => !byId[id]);
if (missing.length) {
  console.error('MISSING IDS: ' + missing.join(', '));
  process.exit(1);
}

const sel = ids.map(id => byId[id]);
const chapters = [...new Set(sel.map(q => q.chapter))].sort((a, b) => a - b);
const chapterLabel = chapters.length > 1
  ? 'CH. ' + chapters[0] + '-' + chapters[chapters.length - 1]
  : 'CH. ' + chapters[0];

const payload = JSON.stringify(sel.map(q => ({
  q: q.q, options: q.options, correct: q.correct, explain: q.explain, chapter: q.chapter
})), null, 2);

const STYLE = [
':root{',
'  --paper:#EDEFEA; --surface:#F8F9F5; --ink:#1C1F1B; --ink-muted:#5B6058;',
'  --border:#C7CBC0; --accent:#2B4A6B; --accent-ink:#F3F7FB;',
'  --correct:#3A6B4A; --correct-bg:#E4EDE3; --incorrect:#A63B2E; --incorrect-bg:#F5E4DF;',
'  --font-display:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,"Times New Roman",serif;',
'  --font-body:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
'  --font-mono:ui-monospace,"SF Mono","Cascadia Code",Consolas,monospace;',
'}',
'@media (prefers-color-scheme: dark){',
'  :root:not([data-theme="light"]){',
'    --paper:#15181A; --surface:#1D2124; --ink:#E7E9E2; --ink-muted:#9AA097;',
'    --border:#33383A; --accent:#82ACCF; --accent-ink:#0F1A22;',
'    --correct:#8FCB9C; --correct-bg:#1E2B21; --incorrect:#E19684; --incorrect-bg:#2E1F1B;',
'  }',
'}',
':root[data-theme="dark"]{',
'  --paper:#15181A; --surface:#1D2124; --ink:#E7E9E2; --ink-muted:#9AA097;',
'  --border:#33383A; --accent:#82ACCF; --accent-ink:#0F1A22;',
'  --correct:#8FCB9C; --correct-bg:#1E2B21; --incorrect:#E19684; --incorrect-bg:#2E1F1B;',
'}',
'*{box-sizing:border-box}',
'body{background:var(--paper);color:var(--ink);font-family:var(--font-body);margin:0;padding:2.5rem 1.25rem;display:flex;justify-content:center}',
'.sheet{width:100%;max-width:600px}',
'.eyebrow{display:flex;justify-content:space-between;align-items:baseline;font-family:var(--font-mono);font-size:12px;letter-spacing:.04em;color:var(--ink-muted);border-bottom:1px solid var(--border);padding-bottom:10px;margin-bottom:22px}',
'.eyebrow .tally{font-variant-numeric:tabular-nums;color:var(--ink)}',
'h1{font-family:var(--font-display);font-weight:400;font-size:25px;line-height:1.35;margin:0 0 22px;text-wrap:balance}',
'.options{list-style:none;margin:0;padding:0;border-top:1px solid var(--border)}',
'.opt{border-bottom:1px solid var(--border)}',
'.opt button{width:100%;text-align:left;background:none;border:none;border-left:3px solid transparent;padding:13px 14px 13px 16px;font-family:var(--font-body);font-size:15px;color:var(--ink);cursor:pointer;display:flex;gap:10px}',
'.opt button:hover:not(:disabled){background:var(--surface)}',
'.opt button:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}',
'.opt button:disabled{cursor:default}',
'.opt .k{font-family:var(--font-mono);color:var(--ink-muted);flex:0 0 auto}',
'.opt.correct button{background:var(--correct-bg);border-left-color:var(--correct)}',
'.opt.correct .k,.opt.correct .label{color:var(--correct)}',
'.opt.incorrect button{background:var(--incorrect-bg);border-left-color:var(--incorrect)}',
'.opt.incorrect .k,.opt.incorrect .label{color:var(--incorrect)}',
'.explain{font-size:13.5px;line-height:1.55;color:var(--ink-muted);background:var(--surface);border:1px solid var(--border);border-radius:4px;padding:12px 14px;margin-top:16px;display:none}',
'.explain b{color:var(--ink);font-weight:600}',
'.explain.show{display:block}',
'.foot{display:flex;justify-content:flex-end;margin-top:20px;min-height:38px}',
'.next{font-family:var(--font-body);font-size:14px;font-weight:600;color:var(--accent-ink);background:var(--accent);border:none;border-radius:4px;padding:10px 18px;cursor:pointer;display:none}',
'.next.show{display:inline-block}',
'.next:focus-visible{outline:2px solid var(--ink);outline-offset:2px}',
'.score-line{font-family:var(--font-mono);font-size:15px;color:var(--ink-muted);margin-bottom:24px}',
'.score-line b{color:var(--ink);font-variant-numeric:tabular-nums}',
'.review{border-top:1px solid var(--border)}',
'.review-item{border-bottom:1px solid var(--border);padding:14px 2px}',
'.review-item .q{font-family:var(--font-display);font-size:15px;margin:0 0 6px}',
'.review-item .a{font-size:13px;color:var(--ink-muted);margin:0 0 6px}',
'.review-item .a b{color:var(--correct)}',
'.retake{font-family:var(--font-body);font-size:14px;font-weight:600;color:var(--accent-ink);background:var(--accent);border:none;border-radius:4px;padding:10px 18px;cursor:pointer;margin-top:22px}',
'.perfect{color:var(--correct)}'
].join('\n');

const RUNTIME = [
'var idx=0, score=0, answered=false;',
'var missed=[];',
'var app=document.getElementById("app");',
'function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}',
'function render(){',
'  if(idx>=QUESTIONS.length){renderDone();return;}',
'  var item=QUESTIONS[idx];',
'  answered=false;',
'  var h="";',
'  h+=\'<div class="eyebrow"><span>\'+(idx+1)+" / "+QUESTIONS.length+" &middot; CH. "+item.chapter+\'</span>\';',
'  h+=\'<span class="tally">SCORE <b>\'+score+"</b>/"+idx+"</span></div>";',
'  h+="<h1>"+esc(item.q)+"</h1>";',
'  h+=\'<ul class="options">\';',
'  for(var i=0;i<item.options.length;i++){',
'    h+=\'<li class="opt" data-i="\'+i+\'"><button type="button"><span class="k">\'+String.fromCharCode(65+i)+\'</span><span class="label">\'+esc(item.options[i])+"</span></button></li>";',
'  }',
'  h+="</ul>";',
'  h+=\'<div class="explain" id="explain"><b>Why:</b> \'+esc(item.explain)+"</div>";',
'  h+=\'<div class="foot"><button class="next" id="next">\'+(idx===QUESTIONS.length-1?"See results":"Next question")+" &rarr;</button></div>";',
'  app.innerHTML=h;',
'  var btns=app.querySelectorAll(".opt button");',
'  for(var j=0;j<btns.length;j++){',
'    (function(b){b.addEventListener("click",function(){selectAnswer(parseInt(b.parentElement.dataset.i,10));});})(btns[j]);',
'  }',
'  document.getElementById("next").addEventListener("click",function(){idx++;render();});',
'}',
'function selectAnswer(i){',
'  if(answered)return;',
'  answered=true;',
'  var item=QUESTIONS[idx];',
'  var opts=app.querySelectorAll(".opt");',
'  for(var k=0;k<opts.length;k++){opts[k].querySelector("button").disabled=true;}',
'  opts[item.correct].classList.add("correct");',
'  if(i!==item.correct){opts[i].classList.add("incorrect");missed.push(item);}else{score++;}',
'  document.getElementById("explain").classList.add("show");',
'  document.getElementById("next").classList.add("show");',
'}',
'function renderDone(){',
'  var pct=Math.round((score/QUESTIONS.length)*100);',
'  var h=\'<div class="eyebrow"><span>REVIEW COMPLETE &middot; \'+CHAPTER_LABEL+\'</span><span class="tally">\'+pct+"%</span></div>";',
'  h+="<h1>"+(score===QUESTIONS.length?"Clean sweep.":"Review complete.")+"</h1>";',
'  h+=\'<p class="score-line">Final score <b>\'+score+"</b> / "+QUESTIONS.length;',
'  if(score===QUESTIONS.length){h+=\' &mdash; <span class="perfect">nothing decayed.</span>\';}',
'  h+="</p>";',
'  if(missed.length){',
'    h+=\'<div class="review">\';',
'    for(var m=0;m<missed.length;m++){',
'      h+=\'<div class="review-item"><p class="q">\'+esc(missed[m].q)+\'</p><p class="a"><b>\'+esc(missed[m].options[missed[m].correct])+\'</b></p><p class="a">\'+esc(missed[m].explain)+"</p></div>";',
'    }',
'    h+="</div>";',
'  }',
'  h+=\'<button class="retake" id="retake">Retake all \'+QUESTIONS.length+"</button>";',
'  app.innerHTML=h;',
'  document.getElementById("retake").addEventListener("click",function(){idx=0;score=0;missed.length=0;render();});',
'}',
'render();'
].join('\n');

const html = '<title>' + quizTitle + '</title>\n'
  + '<style>\n' + STYLE + '\n</style>\n\n'
  + '<div class="sheet" id="app"></div>\n\n'
  + '<script>\n'
  + 'var QUESTIONS = ' + payload + ';\n'
  + 'var CHAPTER_LABEL = ' + JSON.stringify(chapterLabel) + ';\n'
  + RUNTIME + '\n'
  + '</' + 'script>\n';

fs.writeFileSync(outFile, html, 'utf8');
console.log('wrote ' + outFile + ' (' + html.length + ' bytes)');
console.log('questions: ' + ids.join(', '));
console.log('chapters: ' + chapters.join(', '));
