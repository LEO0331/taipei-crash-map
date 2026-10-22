import { afterEach, describe, expect, it, vi } from 'vitest';
import { gzipSync } from 'node:zlib';
import { mkdtemp, rm, readFile, writeFile, cp, mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { BUS_RAW_DIR, BUS_SOURCES, COMPRESSED_LIMIT, DECOMPRESSED_LIMIT, decodeBusSource, busCoordinate, validBusWkt, readBusSources, sha256 } from '../scripts/busServiceSources';
import { boundedBusFetch, fetchBusServiceSources } from '../scripts/fetchBusServiceSources';
import { buildBusServiceSnapshot } from '../scripts/buildBusServiceSnapshot';
const temporary:string[]=[];
const temp=async()=>{const dir=await mkdtemp(path.join(os.tmpdir(),'bus-service-test-'));temporary.push(dir);return dir;};
afterEach(async()=>{vi.unstubAllGlobals();for(const dir of temporary.splice(0))await rm(dir,{recursive:true,force:true});});
const envelope=(rows:unknown[])=>gzipSync(JSON.stringify({EssentialInfo:{UpdateTime:'2026/10/21 14:42:43',CoordinateSystem:'WGS84'},BusInfo:rows}));

describe('bounded official bus source contracts',()=>{
  it('verifies real retained input hashes and all source record counts',async()=>{
    const {manifest,records}=await readBusSources();expect(manifest.sources).toHaveLength(8);
    expect(Object.fromEntries(Object.entries(records).map(([k,v])=>[k,v.length]))).toEqual({Route:800,Stop:28826,StopLocation:5376,PathDetail:43447,SemiTimeTable:3280,TimeTable:35465,BusShape:1028,SpecTimeTable:282});
  });
  it('rejects invalid gzip, invalid UTF8, excessive expansion and missing schema fields',()=>{
    expect(()=>decodeBusSource('Route',Buffer.from('{}'))).toThrow('gzip');
    expect(()=>decodeBusSource('Route',gzipSync(Buffer.from([0xff])))).toThrow();
    expect(()=>decodeBusSource('Route',envelope([{}]))).toThrow('schema fields');
    expect(()=>decodeBusSource('Route',gzipSync(Buffer.alloc(DECOMPRESSED_LIMIT+1,32)))).toThrow();
  });
  it('rejects blank IDs and duplicate native stop IDs instead of making ambiguous joins',()=>{
    const row={Id:1,routeId:2,stopLocationId:3,goBack:'0'};
    expect(()=>decodeBusSource('Stop',envelope([{...row,Id:''}]))).toThrow('identifiers');
    expect(()=>decodeBusSource('Stop',envelope([row,row]))).toThrow('duplicate');
  });
  it('rejects malformed route labels, nested scalar fields and noninteger sequence',()=>{
    const row={Id:1,pathAttributeId:1,providerId:2,nameZh:null,nameEn:'route',pathAttributeName:'variant'};
    expect(()=>decodeBusSource('Route',envelope([row]))).toThrow('names');
    expect(()=>decodeBusSource('Route',envelope([{...row,nameZh:{trace:'not a route name'}}]))).toThrow('nested');
    expect(()=>decodeBusSource('PathDetail',envelope([{id:1,pathAttributeId:1,stopId:1,sequenceNo:'NaN'}]))).toThrow('sequence');
  });
  it('keeps absent and malformed coordinates unavailable and validates WKT',()=>{
    for(const value of [null,undefined,'',' ',NaN,'oops'])expect(busCoordinate(value,90)).toBeNull();
    expect(busCoordinate('25.04',90)).toBe(25.04);expect(busCoordinate('91',90)).toBeNull();
    expect(validBusWkt('LINESTRING (121 25, 122 26)')).toBe(true);
    for(const value of ['LINESTRING (181 25, 122 26)','LINESTRING (121 25)','LINESTRING (x y, 1 2)','POINT (121 25)'])expect(validBusWkt(value)).toBe(false);
  });
  it('rejects unreviewed endpoints before any network request',async()=>{
    const fetcher=vi.fn();await expect(boundedBusFetch('https://example.com',fetcher)).rejects.toThrow('Unreviewed');expect(fetcher).not.toHaveBeenCalled();
  });
  it('bounds exponential retries, Retry-After and permanent HTTP errors',async()=>{
    const sleep=vi.fn(async(_ms:number)=>{});const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:429,headers:{'retry-after':'1'}})).mockResolvedValueOnce(new Response('',{status:503})).mockResolvedValueOnce(new Response('ok'));
    expect((await boundedBusFetch(BUS_SOURCES[0].url,fetcher,sleep)).bytes.toString()).toBe('ok');expect(sleep.mock.calls.map(c=>c[0])).toEqual([1000,1000]);
    const long=vi.fn().mockResolvedValue(new Response('',{status:429,headers:{'retry-after':'3600'}}));await expect(boundedBusFetch(BUS_SOURCES[0].url,long,sleep)).rejects.toThrow('deferred');expect(long).toHaveBeenCalledTimes(1);
    const missing=vi.fn().mockResolvedValue(new Response('',{status:404}));await expect(boundedBusFetch(BUS_SOURCES[0].url,missing,sleep)).rejects.toThrow('404');expect(missing).toHaveBeenCalledTimes(1);
  });
  it('rejects oversized compressed responses',async()=>{
    await expect(boundedBusFetch(BUS_SOURCES[0].url,vi.fn().mockResolvedValue(new Response(new Uint8Array(COMPRESSED_LIMIT+1))))).rejects.toThrow('size limit');
  });
  it('preserves last-good acquisition manifest after a refresh failure',async()=>{
    const dir=await temp();const old='{"lastGood":true}\n';await writeFile(path.join(dir,'manifest.json'),old);
    vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('invalid gzip')));
    await expect(fetchBusServiceSources(true,dir)).rejects.toThrow('gzip');expect(await readFile(path.join(dir,'manifest.json'),'utf8')).toBe(old);
  });
  it('rejects retained hash corruption, unsupported contract version and unsafe filenames',async()=>{
    const dir=await temp();await cp(BUS_RAW_DIR,dir,{recursive:true});const file=path.join(dir,'manifest.json');const original=JSON.parse(await readFile(file,'utf8'));
    const altered=structuredClone(original);altered.sources[0].schemaVersion='future';await writeFile(file,JSON.stringify(altered));await expect(readBusSources(dir)).rejects.toThrow('provenance');
    altered.sources[0]={...original.sources[0],file:'../escape.gz'};await writeFile(file,JSON.stringify(altered));await expect(readBusSources(dir)).rejects.toThrow('allowlist');
    await writeFile(file,JSON.stringify(original));await writeFile(path.join(dir,original.sources[0].file),'corrupt');await expect(readBusSources(dir)).rejects.toThrow('hash mismatch');
  });
  it('rebuilds byte-identically offline and leaves published pointer intact on corrupt source',async()=>{
    const dir=await temp();await buildBusServiceSnapshot(dir);const pointer=await readFile(path.join(dir,'manifest.json'),'utf8');await buildBusServiceSnapshot(dir);expect(await readFile(path.join(dir,'manifest.json'),'utf8')).toBe(pointer);
    const manifest=JSON.parse(pointer);for(const [file,meta] of Object.entries(manifest.files) as [string,{sha256:string;bytes:number}][]){const bytes=await readFile(path.join(dir,file));expect(sha256(bytes)).toBe(meta.sha256);expect(bytes.length).toBe(meta.bytes);}
    const bad=await temp();await mkdir(path.join(bad,'raw'));await writeFile(path.join(bad,'raw','manifest.json'),'{}');await expect(buildBusServiceSnapshot(dir,path.join(bad,'raw'))).rejects.toThrow();expect(await readFile(path.join(dir,'manifest.json'),'utf8')).toBe(pointer);
  },30000);
  it('retains unavailable coordinates and excludes mismatched main-route stop occurrences',async()=>{
    // A deliberately modified copy of real retained inputs is a test-only fixture.
    const dir=await temp();const raw=path.join(dir,'raw');await cp(BUS_RAW_DIR,raw,{recursive:true});const original=await readBusSources();
    const candidatePath=original.records.PathDetail.find(r=>original.records.Route.some(v=>String(v.pathAttributeId)===String(r.pathAttributeId)))!;
    const matches=original.records.PathDetail.filter(r=>String(r.pathAttributeId)===String(candidatePath.pathAttributeId));const stopIds=[...new Set(matches.map(r=>String(r.stopId)))].slice(0,3);expect(stopIds).toHaveLength(3);
    const rows=original.records.Stop.map(r=>String(r.Id)===stopIds[0]?{...r,latitude:null}:String(r.Id)===stopIds[1]?{...r,longitude:''}:String(r.Id)===stopIds[2]?{...r,routeId:999999999}:r);
    const bytes=envelope(rows),decoded=decodeBusSource('Stop',bytes);const manifest=original.manifest;const source=manifest.sources.find(s=>s.id==='Stop')!;source.sha256=sha256(bytes);source.file=source.sha256+'.gz';source.bytes=bytes.length;source.decodedBytes=decoded.decodedBytes;source.sourceUpdatedAt=decoded.sourceUpdatedAt;
    await writeFile(path.join(raw,source.file),bytes);await writeFile(path.join(raw,'manifest.json'),JSON.stringify(manifest));const output=path.join(dir,'public');const snapshot=await buildBusServiceSnapshot(output,raw);
    const candidate=snapshot.candidates.find(c=>c.variantId===String(candidatePath.pathAttributeId))!;const route=snapshot.routes.find(r=>r.id===candidate.routeId)!;const detail=JSON.parse(await readFile(path.join(output,route.detailFile),'utf8'));
    expect(detail.stops.filter((s:{stopId:string})=>stopIds.slice(0,2).includes(s.stopId)).every((s:{lat:number|null;lon:number|null})=>s.lat===null&&s.lon===null)).toBe(true);
    expect(detail.stops.some((s:{stopId:string})=>s.stopId===stopIds[2])).toBe(false);expect(detail.candidates.some((c:{issues:string[]})=>c.issues.includes('broken-route-stop'))).toBe(true);
  },30000);
});
