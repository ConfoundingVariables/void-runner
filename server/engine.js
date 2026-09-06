import { randomUUID, randomInt } from 'node:crypto';
export const COLORS=['#c5ff61','#65d9ff','#ff83bd','#ffd16a'];
export const UPGRADES=[
{id:'rapid',name:'RAPID FIRE',desc:'20% faster firing',apply:p=>p.rate=Math.max(.06,p.rate*.8)},
{id:'spread',name:'SPLIT SHOT',desc:'Two more projectiles',apply:p=>p.spread=Math.min(9,p.spread+2)},
{id:'power',name:'HEAVY ROUNDS',desc:'+1 projectile damage',apply:p=>p.damage++},
{id:'speed',name:'ION THRUSTERS',desc:'20% faster movement',apply:p=>p.speed=Math.min(500,p.speed*1.2)},
{id:'repair',name:'HULL REPAIR',desc:'Restore 3 hull',apply:p=>p.hp=Math.min(p.max,p.hp+3)},
{id:'armor',name:'REINFORCED HULL',desc:'+2 maximum hull and repair 2',apply:p=>{p.max=Math.min(15,p.max+2);p.hp=Math.min(p.max,p.hp+2)}},
{id:'pierce',name:'PHASE ROUNDS',desc:'Pierce one more enemy',apply:p=>p.pierce++},
{id:'blast',name:'VOLATILE AMMO',desc:'Explosive splash damage',apply:p=>p.blast+=.7}];
const rand=(a,b)=>a+Math.random()*(b-a),dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Room {
 constructor(code){Object.assign(this,{code,host:null,players:[],phase:'lobby',wave:1,score:0,time:0,enemies:[],bullets:[],shots:[],events:[],serial:0,spawned:0,spawnTimer:1,clear:0,pause:false});}
 event(x,y,color,n=24){this.events.push({id:++this.serial,x,y,color,n});if(this.events.length>100)this.events.shift()}
 add(name){if(this.players.length>=4)throw Error('Room is full (4/4).');if(this.phase!=='lobby')throw Error('This run has started. Join a new room.');const slot=[0,1,2,3].find(i=>!this.players.some(p=>p.slot===i));const p={id:randomUUID(),slot,name:String(name||'Pilot').replace(/[<>]/g,'').slice(0,16),color:COLORS[slot],input:{},lastInput:0,mods:[],offers:[],chosen:false};this.resetPlayer(p);this.players.push(p);this.host??=p.id;return p;}
 resetPlayer(p){Object.assign(p,{x:240+p.slot*160,y:515,hp:5,max:5,speed:280,rate:.2,cool:0,damage:1,spread:1,pierce:0,blast:0,inv:2,revive:0,mods:[],input:{}})}
 remove(id){this.players=this.players.filter(p=>p.id!==id);if(this.host===id)this.host=this.players[0]?.id??null;if(this.phase==='upgrade')this.advanceIfReady();if(this.phase==='play'&&this.players.length&&!this.players.some(p=>p.hp>0))this.phase='dead';}
 start(id){if(id!==this.host||!['lobby','dead'].includes(this.phase))return;for(const p of this.players)this.resetPlayer(p);Object.assign(this,{phase:'play',wave:1,score:0,time:0,enemies:[],bullets:[],shots:[],events:[],spawned:0,spawnTimer:1,clear:0});}
 input(id,v){const p=this.players.find(p=>p.id===id);if(!p||!v||typeof v!=='object')return;p.input={left:v.left===true,right:v.right===true,up:v.up===true,down:v.down===true,fire:v.fire===true};p.lastInput=Date.now()}
 choose(id,index){const p=this.players.find(p=>p.id===id);if(this.phase!=='upgrade'||!p||p.chosen||!Number.isInteger(index)||index<0||index>=p.offers.length)return;const u=UPGRADES.find(u=>u.id===p.offers[index]);u.apply(p);p.mods.push(u.name);p.chosen=true;this.advanceIfReady()}
 advanceIfReady(){if(this.players.length&&this.players.every(p=>p.chosen)){this.wave++;this.phase='play';this.spawned=0;this.spawnTimer=1;this.clear=0;this.shots=[];this.bullets=[];for(const p of this.players){p.offers=[];p.input={};p.inv=2;}}}
 salvage(){this.phase='upgrade';this.shots=[];for(const p of this.players){if(p.hp<=0)p.hp=Math.min(3,p.max);p.revive=0;p.chosen=false;p.input={};const pool=UPGRADES.filter(u=>u.id!=='spread'||p.spread<9);p.offers=[];while(p.offers.length<3){const i=randomInt(pool.length);p.offers.push(pool.splice(i,1)[0].id)}}}
 hurt(p){if(p.hp<=0||p.inv>0)return;p.hp--;p.inv=1.5;this.event(p.x,p.y,p.color,p.hp?15:45)}
 kill(e){if(e.dead)return;e.dead=true;this.score+=e.type==='boss'?1500:e.type==='tank'?150:75;this.event(e.x,e.y,'#ff9b65',e.type==='boss'?70:25)}
 spawn(){const boss=this.wave%5===0,tank=!boss&&Math.random()<.25;const hp=(boss?55+this.wave*12:tank?4+Math.floor(this.wave/2):1+Math.floor(this.wave/3))*(1+(this.players.length-1)*.55);this.enemies.push({id:++this.serial,x:boss?480:rand(40,920),y:-40,hp,max:hp,type:boss?'boss':tank?'tank':'scout',r:boss?58:tank?20:15,age:rand(0,6),speed:boss?35:tank?45+this.wave*3:65+this.wave*5,fire:rand(1,3)});this.spawned++}
 tick(dt){if(this.phase!=='play')return;this.time+=dt;const live=this.players.filter(p=>p.hp>0);if(!live.length){this.phase='dead';return;}for(const p of this.players){p.inv-=dt;if(p.hp<=0){const near=live.some(a=>dist(p,a)<55);p.revive=near?p.revive+dt:Math.max(0,p.revive-dt);if(p.revive>=3){p.hp=Math.min(3,p.max);p.inv=3;p.revive=0;this.event(p.x,p.y,p.color,35)}continue;}if(Date.now()-p.lastInput>500)p.input={};const k=p.input;let x=(k.right?1:0)-(k.left?1:0),y=(k.down?1:0)-(k.up?1:0),n=Math.hypot(x,y)||1;p.x=clamp(p.x+x/n*p.speed*dt,20,940);p.y=clamp(p.y+y/n*p.speed*dt,30,575);p.cool-=dt;if(k.fire&&p.cool<=0){p.cool=p.rate;for(let i=0;i<p.spread;i++){const a=(i-(p.spread-1)/2)*.14;this.bullets.push({id:++this.serial,owner:p.id,color:p.color,x:p.x,y:p.y-20,vx:Math.sin(a)*520,vy:-Math.cos(a)*520,damage:p.damage,pierce:p.pierce,blast:p.blast,hit:new Set()})}}}
 const total=this.wave%5===0?1:8+this.wave*3+(this.players.length-1)*3;this.spawnTimer-=dt;if(this.spawned<total&&this.spawnTimer<=0){this.spawn();this.spawnTimer=Math.max(.25,.95-this.wave*.035)}
 for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt}
 for(const e of this.enemies){if(e.dead)continue;e.age+=dt;e.y+=e.speed*dt;if(e.type==='boss'&&e.y>95){e.y=95;e.x=480+Math.sin(e.age*.65)*310}else e.x+=Math.sin(e.age*2)*25*dt;e.fire-=dt;if(e.fire<=0&&e.y>0){const target=live.reduce((a,b)=>dist(e,a)<dist(e,b)?a:b),a=Math.atan2(target.y-e.y,target.x-e.x),count=e.type==='boss'?9:e.type==='tank'?3:1;for(let i=0;i<count;i++){const angle=a+(i-(count-1)/2)*.19;this.shots.push({id:++this.serial,x:e.x,y:e.y,vx:Math.cos(angle)*(130+this.wave*5),vy:Math.sin(angle)*(130+this.wave*5)})}e.fire=e.type==='boss'?.8:rand(1.8,3.2)}for(const p of live)if(dist(e,p)<e.r+11){this.hurt(p);if(e.type!=='boss')e.dead=true}if(e.y>650)e.dead=true;
 for(const b of this.bullets){if(e.dead||b.dead||b.hit.has(e.id)||dist(e,b)>=e.r+5)continue;b.hit.add(e.id);e.hp-=b.damage;if(b.blast){this.event(b.x,b.y,'#ffbf68',6);for(const other of this.enemies)if(other!==e&&!other.dead&&dist(e,other)<65){other.hp-=b.blast;if(other.hp<=0)this.kill(other)}}if(b.pierce--<=0)b.dead=true;if(e.hp<=0)this.kill(e)}}
 for(const s of this.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;for(const p of live)if(!s.dead&&dist(s,p)<13){s.dead=true;this.hurt(p)}}
 this.bullets=this.bullets.filter(b=>!b.dead&&b.y>-30&&b.x>-30&&b.x<990);this.shots=this.shots.filter(s=>!s.dead&&s.y<630&&s.y>-50&&s.x>-30&&s.x<990);this.enemies=this.enemies.filter(e=>!e.dead);
 if(!this.players.some(p=>p.hp>0)){this.phase='dead';return}if(this.spawned>=total&&!this.enemies.length){this.clear+=dt;if(this.clear>1.1)this.salvage()}}
 snapshot(){return {type:'state',code:this.code,host:this.host,phase:this.phase,wave:this.wave,score:this.score,time:this.time,players:this.players.map(({input,lastInput,cool,...p})=>p),enemies:this.enemies,bullets:this.bullets.map(({hit,...b})=>b),shots:this.shots,events:this.events}};
}
