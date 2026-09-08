'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
http.createServer((request,response)=>{
  const url=new URL(request.url,'http://localhost');
  const route=url.pathname.startsWith('/997606/')?'/tests/fixture.html':url.pathname;
  const file=path.resolve(root,'.'+route);
  if(!file.startsWith(root+path.sep)){response.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){response.writeHead(404).end();return;}
    const type=file.endsWith('.html')?'text/html; charset=utf-8':file.endsWith('.js')?'text/javascript; charset=utf-8':'text/plain; charset=utf-8';
    response.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store'}).end(data);
  });
}).listen(8765,'0.0.0.0',()=>console.log('Fixture: http://127.0.0.1:8765/997606/person/checkin'));
