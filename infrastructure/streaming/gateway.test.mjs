import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {WebSocketServer,WebSocket} from 'ws';
import {SignJWT} from 'jose';
import {startGateway} from './gateway.mjs';
test('Redis allocation, capacity, signed websocket access, forwarding and cleanup',async()=>{
 const token=randomUUID()+randomUUID(),key=randomUUID()+randomUUID();const worker=new WebSocketServer({port:7099});worker.on('connection',socket=>socket.on('message',message=>socket.send(message.toString())));
 const gateway=await startGateway({redisUrl:process.env.REDIS_URL??'redis://127.0.0.1:6379',workers:{test:'ws://127.0.0.1:7099'},serviceToken:token,signingKey:key,publicUrl:'ws://127.0.0.1:7091',namespace:'test:'+randomUUID(),allocatorPort:7090,gatewayPort:7091});
 const id=randomUUID();const headers={Authorization:'Bearer '+token,'Content-Type':'application/json'};
 try{
  assert.equal((await fetch('http://127.0.0.1:7090/health')).status,401);
  const allocate=()=>fetch('http://127.0.0.1:7090/sessions',{method:'POST',headers,body:JSON.stringify({sessionId:id})});
  assert.equal((await allocate()).status,200);assert.equal((await allocate()).status,200);
  assert.equal((await fetch('http://127.0.0.1:7090/sessions',{method:'POST',headers,body:JSON.stringify({sessionId:randomUUID()})})).status,503);
  const sign=async(sessionId)=>new SignJWT({session_id:sessionId,tenant_id:randomUUID()}).setProtectedHeader({alg:'HS256'}).setIssuer('automotive-xr-api').setAudience('pixel-streaming-gateway').setSubject('test').setIssuedAt().setExpirationTime('1m').sign(new TextEncoder().encode(key));
  const invalid=new WebSocket('ws://127.0.0.1:7091/sessions/'+id+'?token='+await sign(randomUUID()));await new Promise(resolve=>invalid.once('error',resolve));
  const socket=new WebSocket('ws://127.0.0.1:7091/sessions/'+id+'?token='+await sign(id));await new Promise((resolve,reject)=>{socket.once('open',resolve);socket.once('error',reject)});const received=new Promise(resolve=>socket.once('message',data=>resolve(data.toString())));socket.send('signaling-fixture');assert.equal(await received,'signaling-fixture');socket.close();
  assert.equal((await fetch('http://127.0.0.1:7090/sessions/'+id+'/heartbeat',{method:'POST',headers})).status,200);
  assert.equal((await fetch('http://127.0.0.1:7090/sessions/'+id,{method:'DELETE',headers})).status,204);
  assert.equal((await fetch('http://127.0.0.1:7090/sessions/'+id,{method:'DELETE',headers})).status,204);
 }finally{await gateway.close();await new Promise(resolve=>worker.close(resolve));}
});
