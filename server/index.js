import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { randomInt } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { Room } from './engine.js';
const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/game.js':'game.js','/online.js':'online.js','/config.js':'config.js'};
export function createGameServer(){
 const rooms=new Map();
 const server=http.createServer(async(req,res)=>{const path=new URL(req.url,'http://localhost').pathname;if(path==='/health'){res.writeHead(200,{'Content-Type':'application/json'});return res.end(JSON.stringify({ok:true,rooms:rooms.size}))}const file=files[path];if(!file){res.writeHead(404);return res.end('Not found')}try{const data=await readFile(new URL('../'+file,import.meta.url));res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.css')?'text/css':'text/javascript','X-Content-Type-Options':'nosniff'});res.end(data)}catch{res.writeHead(500);res.end('Unable to load game')}});
 const wss=new WebSocketServer({server,maxPayload:2048});
 const send=(ws,v)=>{if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<262144)ws.send(JSON.stringify(v))};
 const leave=ws=>{if(ws.room){ws.room.remove(ws.pid);if(!ws.room.players.length)rooms.delete(ws.room.code);ws.room=null}};
 wss.on('connection',ws=>{if(wss.clients.size>200){ws.close(1013,'Server full');return}ws.alive=true;ws.on('pong',()=>ws.alive=true);ws.on('error',()=>{});ws.on('close',()=>leave(ws));let count=0,windowStart=Date.now();ws.on('message',raw=>{if(Date.now()-windowStart>1000){count=0;windowStart=Date.now()}if(++count>90){ws.close(1008,'Too many messages');return}try{const m=JSON.parse(raw);if(!m||typeof m!=='object')return;if(m.type==='create'||m.type==='join'){if(ws.room)throw Error('Leave your current room first.');let room;if(m.type==='create'){if(rooms.size>=50)throw Error('Server is full. Try again later.');let code;do{code=Array.from({length:6},()=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(31)]).join('')}while(rooms.has(code));room=new Room(code);rooms.set(code,room)}else{room=rooms.get(String(m.code||'').toUpperCase());if(!room)throw Error('Room not found. Check the code.')}const p=room.add(m.name);ws.room=room;ws.pid=p.id;send(ws,{type:'joined',id:p.id,code:room.code});}else if(m.type==='input')ws.room?.input(ws.pid,m.input);else if(m.type==='start')ws.room?.start(ws.pid);else if(m.type==='choose')ws.room?.choose(ws.pid,m.index);else if(m.type==='leave'){leave(ws);send(ws,{type:'left'})}}catch(e){send(ws,{type:'error',message:e instanceof SyntaxError?'Invalid message.':e.message})}})});
 const tick=setInterval(()=>{for(const room of rooms.values())room.tick(1/30);},1000/30);
 const publish=setInterval(()=>{for(const room of rooms.values()){const state=room.snapshot();for(const ws of wss.clients)if(ws.room===room)send(ws,state)}},50);
 const heartbeat=setInterval(()=>{for(const ws of wss.clients){if(!ws.alive){ws.terminate();continue}ws.alive=false;ws.ping()}},15000);
 const close=()=>new Promise(resolve=>{clearInterval(tick);clearInterval(publish);clearInterval(heartbeat);for(const ws of wss.clients)ws.terminate();wss.close(()=>server.close(resolve))});
 return {server,wss,rooms,close};
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const app=createGameServer();app.server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log('VOIDRUNNER server listening'));process.on('SIGTERM',async()=>{await app.close();process.exit(0)})}
