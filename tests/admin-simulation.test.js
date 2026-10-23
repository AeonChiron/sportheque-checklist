import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');
// Run the production functions with a fixed clock and explicit UI/network boundaries.
function fn(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, name);
  return source.slice(start, source.indexOf('\n}', start) + 2);
}
function context(extra = {}) {
  return vm.createContext({ Date, clearTimeout, ...extra });
}
function scheduleContext(hour = 10, minute = 0) {
  const c = context({
    Date: class extends Date { constructor(...args) { super(...(args.length ? args : ['2026-10-20T'+String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')+':00'])); } },
    sc: {1: {start:'10:00',end:'18:00'}}, submitted: null,
    mySchedule: () => c.sc, editableShift: () => c.submitted,
    todayISO: () => '2026-10-20', EARLY_MIN: 30,
    addDays: (iso, n) => { const d = new Date(iso+'T12:00:00'); d.setDate(d.getDate()+n); return d.toISOString().slice(0,10); },
    dowOf: iso => (new Date(iso+'T12:00:00').getDay()+6)%7,
    presetOf: x => x || null, toMin: x => +x.slice(0,2)*60 + +x.slice(3),
    specialFor: () => null, SPECIALS: [], extras: { overrides: {}, tasks: [] },
  });
  vm.runInContext(fn('mySched'), c);
  vm.runInContext(fn('nextShift'), c);
  return c;
}
test('today starting now is ready; an hour away remains an upcoming shift', () => {
  const c = scheduleContext();
  assert.equal(c.nextShift().ready, true);
  c.sc[1] = {start:'11:00',end:'19:00'};
  assert.equal(c.nextShift().date,'2026-10-20');
  assert.equal(c.nextShift().ready,false);
});
test('future and ended shifts resolve to the next scheduled date', () => {
  const c = scheduleContext(19);
  assert.equal(c.nextShift().date,'2026-10-27');
  c.sc = {2:{start:'10:00',end:'18:00'}};
  assert.equal(c.nextShift().date,'2026-10-21');
});
test('an older completed shift does not hide a newly entered shift today', () => {
  const c = scheduleContext();
  c.submitted = {start:'07:00',end:'09:00'};
  assert.equal(c.nextShift().date,'2026-10-20');
  c.submitted = {start:'10:00',end:'18:00'};
  assert.equal(c.nextShift().date,'2026-10-27');
});
test('schedule saves repaint the current screen immediately without simulation uploads', () => {
  for (const current of ['auth','history','setup']) {
    const events=[];
    const c=context({prefs:{},current,setupNext:null,schedKey:()=> 'admin',savePrefs:()=>{},nextShift:()=>({ready:true}),paintFront:()=>events.push('auth'),renderHistory:()=>events.push('history'),paintSetupSched:()=>events.push('setup'),pushSchedule:()=>events.push('push')});
    vm.runInContext(fn('refreshScheduleStatus')+'\n'+fn('saveSchedule'),c);
    c.saveSchedule({1:{start:'10:00',end:'18:00'}});
    assert.deepEqual(events,[current,'push']);
    events.length=0; c.prefs.simNew={}; c.saveSchedule({});
    assert.deepEqual(events,[current]);
    assert.equal(c.setupNext.ready,true);
  }
});
test('confirmation is required and only real admins can start a simulation', () => {
  const controls={'#simulationNo':{},'#simulationYes':{}}; let realAdmin=false,opened=0,starts=0,reloads=0;
  const c=context({prefs:{clockOffset:500,state:'unused'},state:{tasks:{real:{done:true}}},pushSchedule:{},mySchedule:()=>({1:'jour'}),isRealAdmin:()=>realAdmin,t:x=>x,esc:x=>x,$:x=>controls[x],openSheet:(_h,mount)=>{opened++;mount();},openNextOverview:()=>{},startAt:()=>new Date('2026-10-21T10:00:00'),savePrefs:()=>{},startScheduled:(_nx,opts)=>{assert.equal(opts.simulation,true);starts++;},location:{reload:()=>reloads++}});
  vm.runInContext(fn('confirmShiftSimulation'),c);
  c.confirmShiftSimulation({}); assert.equal(opened,0);
  realAdmin=true; c.confirmShiftSimulation({}); assert.equal(starts,0);
  controls['#simulationYes'].onclick();
  assert.equal(starts,1); assert.equal(reloads,1);
  assert.equal(c.prefs.simShift.state.tasks.real.done,true);
  assert.equal(c.prefs.workAsEmp,true);
});
test('exit restores the prior shift, clock and work mode', () => {
  const original={tasks:{real:{done:true}}}; let saved=0,reloaded=0;
  const c=context({prefs:{simShift:{state:original,clockOffset:123,workAsEmp:false},clockOffset:999,workAsEmp:true},state:{tasks:{}},save:()=>saved++,savePrefs:()=>{},location:{reload:()=>reloaded++}});
  vm.runInContext(fn('exitShiftSimulation'),c); c.exitShiftSimulation();
  assert.equal(c.state,original); assert.equal(c.prefs.clockOffset,123);
  assert.equal(c.prefs.workAsEmp,false); assert.equal(c.prefs.simShift,undefined);
  assert.equal(saved,1); assert.equal(reloaded,1);
});
test('scheduled simulation uses the selected date and opens the real checklist', () => {
  let opened=0;
  const c=context({state:null,shiftName:()=> 'Admin',todayISO:()=> '2026-10-20',detectShift:()=>1,save:()=>{},window:{history:{replaceState:()=>{}}},history:{state:null,replaceState:()=>{}},location:{pathname:'/'},openChecklist:()=>opened++});
  vm.runInContext(fn('startScheduled'),c);
  c.startScheduled({date:'2026-10-21',start:'10:00',end:'18:00'},{simulation:true});
  assert.equal(c.state.date,'2026-10-21'); assert.equal(c.state.simulation,true); assert.equal(opened,1);
});
test('first-login preview restores the real schedule, onboarding and in-progress shift', () => {
  const original={tasks:{real:{done:true}}}; let restored;
  const c=context({prefs:{simNew:{sched:{1:'jour'},state:original,welcomed:true,workAsEmp:false},welcomed:{}},state:null,plan:{},session:{user:{email:'admin'}},saveSchedule:x=>restored=x,save:()=>{},savePrefs:()=>{}});
  vm.runInContext(fn('restoreNewbie'),c); c.restoreNewbie();
  assert.equal(restored[1],'jour'); assert.equal(c.state,original);
  assert.equal(c.prefs.welcomed.admin,true); assert.equal(c.prefs.simNew,undefined); assert.equal(c.plan,null);
});
test('new user simulation clears an existing shift and restarts the tutorial without losing originals', () => {
  const original={tasks:{real:{done:true}}}; let role,tourDelay;
  const c=context({prefs:{welcomed:{admin:true},workAsEmp:true},state:original,plan:{},session:{user:{email:'admin'}},isRealAdmin:()=>true,mySchedule:()=>({1:'jour'}),pushSchedule:{},save:()=>{},savePrefs:()=>{},saveSchedule:()=>{},setViewAs:r=>role=r,closeSheet:()=>{},paintViewAs:()=>{},goFront:()=>{},paintFront:()=>{},startTour:()=>{},setTimeout:(_f,delay)=>tourDelay=delay});
  vm.runInContext(fn('startNewbie'),c); c.startNewbie('boss');
  assert.equal(c.state,null); assert.equal(c.plan,null); assert.equal(role,'boss');
  assert.equal(c.prefs.simNew.state,original); assert.equal(c.prefs.simNew.sched[1],'jour');
  assert.equal(c.prefs.simNew.welcomed,true); assert.equal(c.prefs.simNew.tourStep,0);
  assert.equal(c.prefs.simNew.tourDone,false); assert.equal(c.prefs.welcomed.admin,undefined);
  assert.equal(tourDelay,420);
});
test('real admin controls remain available when viewing employee and supervisor roles', () => {
  for (const view of ['employee','boss','newEmployee','newBoss','admin']) {
    const made = {}; const hosts = { '#quickBar .qb-left': [], '#auth .pool-top .setup-tools': [] };
    const doc = { getElementById: (id) => made[id] || null, createElement: () => ({ setAttribute() {}, addEventListener(ev, f) { this.click = f; } }) };
    const c=context({prefs:{},$:sel=>hosts[sel] ? { prepend: (b) => { hosts[sel].push(b); made[b.id] = b; }, append: (b) => { hosts[sel].push(b); made[b.id] = b; } } : null,isRealAdmin:()=>true,curView:()=>view,viewAs:()=>view,roleName:x=>x,esc:x=>x,t:x=>x,document:doc,openViewMenu:()=>{},EYE:''});
    vm.runInContext(fn('adminViewLabel')+fn('paintAdminTools'),c); c.paintAdminTools();
    // Toujours deux accès : la barre du haut et la page bleue; aucun bouton flottant.
    assert.equal(hosts['#quickBar .qb-left'].length,1); assert.equal(hosts['#auth .pool-top .setup-tools'].length,1);
    assert.equal(typeof made.qbView.click,'function'); assert.equal(typeof made.poolView.click,'function');
  }
});
test('simulation completion and issues never call publishing services', async () => {
  const c=context({prefs:{simShift:{}},state:null,toast:()=>{},t:x=>x,publishShift:()=>{throw Error('unexpected publish');},createProblem:()=>{throw Error('unexpected issue');}});
  vm.runInContext('async '+fn('saveShift')+'\nasync '+fn('submitProblem'),c);
  await c.saveShift(); await c.submitProblem({});
});
