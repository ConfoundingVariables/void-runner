import { Room } from './shared/engine.js';
// Render carries only room discovery and SDP/ICE. Gameplay goes over data channels.
export class PeerSession {
  constructor(signal, receive, fail) {
    Object.assign(this,{signal,receive,fail,peers:new Map(),room:null,id:null,host:null,code:null,closed:false});
  }
  async message(m) {
    try {
      if(m.type==='peer-ready') {
        this.id=m.peer;this.host=m.host;this.code=m.code;
        if(this.id===this.host){this.room=new Room(this.code);const p=this.room.add(this.name);this.player=p.id;this.receive({type:'joined',id:p.id,code:this.code});this.publish();}
      }
      if(m.type==='peer-new')await this.link(m.peer,true);
      if(m.type==='signal') {
        const entry=this.peers.get(m.from)||await this.link(m.from,false);
        if(m.data?.description){await entry.pc.setRemoteDescription(m.data.description);for(const ice of entry.ice.splice(0))await entry.pc.addIceCandidate(ice);if(m.data.description.type==='offer'){await entry.pc.setLocalDescription(await entry.pc.createAnswer());this.signal({type:'signal',to:m.from,data:{description:entry.pc.localDescription}})}}
        if(m.data?.candidate){if(entry.pc.remoteDescription)await entry.pc.addIceCandidate(m.data.candidate);else entry.ice.push(m.data.candidate)}
      }
      if(m.type==='peer-left'){const e=this.peers.get(m.peer);if(e?.player)this.room?.remove(e.player);e?.pc.close();this.peers.delete(m.peer);this.publish()}
      if(m.type==='peer-ended')this.fail(m.message);
    }catch(e){this.fail('Peer connection failed. Try server mode; this network may need a TURN relay.')}
  }
  async link(id,offer) {
    const pc=new RTCPeerConnection({iceServers:window.VOIDRUNNER_ICE_SERVERS||[{urls:'stun:stun.l.google.com:19302'}]});
    const e={pc,ice:[],control:null,state:null,player:null};this.peers.set(id,e);
    pc.onicecandidate=ev=>{if(ev.candidate)this.signal({type:'signal',to:id,data:{candidate:ev.candidate}})};
    const deadline=setTimeout(()=>{if(!this.closed&&pc.connectionState!=='connected'){this.fail('Direct connection timed out. Try server mode; this network may need a TURN relay.')}},15000);
    pc.onconnectionstatechange=()=>{if(pc.connectionState==='connected')clearTimeout(deadline);if(pc.connectionState==='failed'){clearTimeout(deadline);if(this.room){if(e.player)this.room.remove(e.player);pc.close();this.peers.delete(id);this.publish()}else this.fail('Host connection lost. Return to the lobby.')}};
    const attach=channel=>{e[channel.label]=channel;channel.onmessage=ev=>{if(ev.data.length>262144)return;try{const m=JSON.parse(ev.data);if(this.room)this.command(e,m);else this.receive(m)}catch{}};channel.onopen=()=>{if(!this.room&&channel.label==='control')channel.send(JSON.stringify({type:'hello',name:this.name}));};};
    pc.ondatachannel=ev=>attach(ev.channel);
    if(offer){attach(pc.createDataChannel('control'));attach(pc.createDataChannel('state',{ordered:false,maxRetransmits:0}));await pc.setLocalDescription(await pc.createOffer());this.signal({type:'signal',to:id,data:{description:pc.localDescription}})}
    return e;
  }
  write(channel,message){if(channel?.readyState==='open'&&channel.bufferedAmount<131072)channel.send(JSON.stringify(message))}
  command(e,m) {
    if(m.type==='hello'&&!e.player){try{const p=this.room.add(m.name);e.player=p.id;this.write(e.control,{type:'joined',id:p.id,code:this.code});this.publish()}catch(err){this.write(e.control,{type:'error',message:err.message})}return}
    if(!e.player)return;
    if(m.type==='frames')this.room.frames(e.player,m.frames,m.epoch);
    if(m.type==='choose')this.room.choose(e.player,m.index);
    if(m.type==='ping')this.write(e.control,{type:'pong',sent:m.sent});
  }
  send(m) {
    if(this.room){if(m.type==='frames')this.room.frames(this.player,m.frames,m.epoch);if(m.type==='choose')this.room.choose(this.player,m.index);if(m.type==='start'){this.room.start(this.player);this.signal({type:'peer-started'})}if(m.type==='ping')this.receive({type:'pong',sent:m.sent});}
    else this.write(this.peers.get(this.host)?.control,m);
  }
  tick(dt){if(!this.room||this.closed)return;this.carry=(this.carry||0)+Math.min(dt,.1);while(this.carry>=1/60){this.room.tick(1/60);this.carry-=1/60}this.since=(this.since||0)+dt;if(this.since>=1/30){this.since=0;this.publish()}}
  publish(){if(!this.room)return;const snapshot=this.room.snapshot();for(const e of this.peers.values()){this.write(e.state,snapshot)}this.receive(JSON.parse(JSON.stringify(snapshot)))}
  close(){this.closed=true;for(const e of this.peers.values())e.pc.close();this.peers.clear();this.room=null;}
}
