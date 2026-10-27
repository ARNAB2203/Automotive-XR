/** Fixed GPU worker pool allocator and authenticated signaling proxy. Not autoscaling. */
import {createServer} from 'node:http';
import {timingSafeEqual} from 'node:crypto';
import {createClient} from 'redis';
import {WebSocket,WebSocketServer} from 'ws';
import {jwtVerify} from 'jose';
export async function startGateway(settings){
 const {redisUrl,workers,serviceToken,signingKey,publicUrl,namespace='xr:stream',allocatorPort=7000,gatewayPort=7001}=settings;
 if(!serviceToken||serviceToken.length<32||!signingKey||signingKey.length<32||!Object.keys(workers).length)throw new Error('Worker pool and strong service/signing keys required');
 const db=createClient({url:redisUrl});db.on('error',()=>console.error(JSON.stringify({event:'stream.redis.error'})));await db.connect();
 const owners=namespace+':owners',sessions=namespace+':sessions',lease=id=>namespace+':lease:'+id;
 const tokenMatches=value=>{const a=Buffer.from(value??''),b=Buffer.from('Bearer '+serviceToken);return a.length===b.length&&timingSafeEqual(a,b)};
 const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
 const allocator=createServer(async(req,res)=>{try{
  if(!tokenMatches(req.headers.authorization)){res.writeHead(401);res.end();return;}
  const path=new URL(req.url??'/','http://local').pathname;
  const json=(body,status=200)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(body));};
  if(path==='/health'){json({status:'ok'});return;}
  if(path==='/metrics'){json({capacity:Object.keys(workers).length,allocated:await db.hLen(owners)});return;}
  if(path==='/sessions'&&req.method==='POST'){
   let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>4096)throw new Error('Too large');}const {sessionId}=JSON.parse(raw);if(!uuid.test(sessionId??'')){json({error:'invalid_session'},400);return;}
   const allocated=await db.eval(`local existing=redis.call('HGET',KEYS[2],ARGV[1]); if existing then return existing end; for i=2,#ARGV do if redis.call('HEXISTS',KEYS[1],ARGV[i])==0 then redis.call('HSET',KEYS[1],ARGV[i],ARGV[1]);redis.call('HSET',KEYS[2],ARGV[1],ARGV[i]);redis.call('SET',KEYS[3],'active','EX',90);return ARGV[i] end end;return ''`,{keys:[owners,sessions,lease(sessionId)],arguments:[sessionId,...Object.keys(workers)]});
   if(!allocated){json({error:'capacity_exhausted'},503);return;}
   json({signalingUrl:publicUrl.replace(/\/$/,'')+'/sessions/'+sessionId});return;
  }
  const match=path.match(/^\/sessions\/([^/]+)(\/heartbeat)?$/);if(!match||!uuid.test(match[1])){json({error:'not_found'},404);return;}const id=match[1];
  if(req.method==='DELETE'&&!match[2]){await db.eval(`local worker=redis.call('HGET',KEYS[2],ARGV[1]);if worker then redis.call('HDEL',KEYS[1],worker);redis.call('HDEL',KEYS[2],ARGV[1]);end;redis.call('DEL',KEYS[3]);return 1`,{keys:[owners,sessions,lease(id)],arguments:[id]});res.writeHead(204);res.end();return;}
  if(req.method==='POST'&&match[2]){if(!await db.hExists(sessions,id)){json({error:'not_found'},404);return;}await db.set(lease(id),'active',{EX:90});json({status:'active'});return;}
  json({error:'not_found'},404);
 }catch{res.writeHead(503);res.end();}});
 const websocketServer=new WebSocketServer({noServer:true,maxPayload:1024*1024});
 const gateway=createServer((_req,res)=>{res.writeHead(404);res.end();});
 gateway.on('upgrade',async(req,socket,head)=>{try{
  const url=new URL(req.url??'/','http://local');const match=url.pathname.match(/^\/sessions\/([^/]+)$/);if(!match||!uuid.test(match[1]))throw new Error('Invalid route');
  const {payload}=await jwtVerify(url.searchParams.get('token')??'',new TextEncoder().encode(signingKey),{issuer:'automotive-xr-api',audience:'pixel-streaming-gateway',algorithms:['HS256'],requiredClaims:['sub','exp','tenant_id','session_id']});
  const id=match[1];if(payload.session_id!==id||!await db.exists(lease(id)))throw new Error('Inactive session');const worker=await db.hGet(sessions,id);if(!worker||!workers[worker])throw new Error('No worker');
  websocketServer.handleUpgrade(req,socket,head,client=>{
   const upstream=new WebSocket(workers[worker],{maxPayload:1024*1024});const queued=[];let queuedSize=0;
   const close=()=>{client.close();upstream.close();};
   const timer=setInterval(async()=>{try{if(!await db.exists(lease(id)))close();}catch{close();}},5000);timer.unref();
   client.on('message',(data,isBinary)=>{if(upstream.readyState===WebSocket.OPEN)upstream.send(data,{binary:isBinary});else if(upstream.readyState===WebSocket.CONNECTING){queuedSize+=data.length;if(queuedSize>1024*1024)return close();queued.push([data,isBinary]);}});
   upstream.on('open',()=>{for(const [data,binary] of queued)upstream.send(data,{binary});queued.length=0;});
   upstream.on('message',(data,isBinary)=>{if(client.readyState===WebSocket.OPEN)client.send(data,{binary:isBinary});});
   upstream.on('error',close);client.on('error',close);upstream.on('close',()=>{clearInterval(timer);client.close();});client.on('close',()=>{clearInterval(timer);upstream.close();});
  });
 }catch{socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');socket.destroy();}});
 await new Promise(resolve=>allocator.listen(allocatorPort,'127.0.0.1',resolve));
 await new Promise(resolve=>gateway.listen(gatewayPort,'0.0.0.0',resolve));
 return {close:async()=>{for(const client of websocketServer.clients)client.terminate();await Promise.all([new Promise(r=>allocator.close(r)),new Promise(r=>gateway.close(r))]);await db.quit();}};
}
if(import.meta.url===new URL(process.argv[1],'file:').href){
 const instance=await startGateway({redisUrl:process.env.REDIS_URL??'redis://127.0.0.1:6379',workers:JSON.parse(process.env.GPU_WORKERS_JSON??'{}'),serviceToken:process.env.ALLOCATOR_SERVICE_TOKEN,signingKey:process.env.STREAM_SIGNING_KEY,publicUrl:process.env.PUBLIC_GATEWAY_URL,namespace:process.env.STREAM_NAMESPACE});
 console.log(JSON.stringify({event:'stream.gateway.ready'}));process.on('SIGTERM',()=>instance.close().then(()=>process.exit()));
}
